import React, { useState, useEffect, useRef, useCallback } from 'react';
import TinySegmenter from 'tiny-segmenter';

import { Play, X, Settings, Monitor, Type } from 'lucide-react';



// --- 外部ファイルからテキストを読み込む関数 ---

/**
 * 外部ファイルからテキストを読み込む
 * @param {string} filename - 読み込むファイル名（publicフォルダ内）
 * @returns {Promise<string>} - ファイルの内容
 */
async function loadTextFromFile(filename) {
  try {
    const baseUrl = import.meta.env.BASE_URL;
    const path = `${baseUrl}${filename}`.replace(/\/\/+/g, '/');
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    return '';
  }
}

export default function App() {

  // --- 状態と参照の定義 ---

  // UI表示用
  const [inputText, setInputText] = useState('');
  const [words, setWords] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [groupingMode, setGroupingMode] = useState('bunsetsu');
  const [maxCharLength, setMaxCharLength] = useState(4);
  const [theme, setTheme] = useState('modern');
  const [currentIndex, setCurrentIndex] = useState(0); // 現在の再生位置
  const [elapsedTime, setElapsedTime] = useState(0);

  // タイマー管理用（これだけでOK）
  const timerRef = useRef(null);



  // =================================================================
  // 経過時間の計算（currentIndexとwpmから自動計算）
  // =================================================================
  useEffect(() => {
    const intervalMs = 60000 / wpm;
    setElapsedTime((currentIndex * intervalMs) / 1000);
  }, [currentIndex, wpm]);

  // =================================================================
  // WPM変更時に再生中なら自動的に再起動
  // =================================================================
  useEffect(() => {
    if (isPlaying) {
      // 一旦停止して再開
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const intervalMs = 60000 / wpm;
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= words.length) {
            // 最後まで到達したら停止
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setIsPlaying(false);
            return 0; // 最初に戻す
          }
          return next;
        });
      }, intervalMs);
    }
  }, [wpm]); // wpmが変わったら再起動

  // =================================================================
  // コンポーネントアンマウント時のクリーンアップ
  // =================================================================
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);





  // --- 再生開始 ---
  const startPlay = () => {
    if (words.length === 0 || currentIndex >= words.length || isPlaying) {
      return;
    }
    
    setIsPlaying(true);
    
    const intervalMs = 60000 / wpm;
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= words.length) {
          // 最後まで到達したら停止
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsPlaying(false);
          return 0; // 最初に戻す
        }
        return next;
      });
    }, intervalMs);
  };

  // --- 再生停止 ---
  const stopPlay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  };



  // --- シーク操作 ---
  const handleProgressChange = (e) => {
    // まず停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    
    // 新しい位置にジャンプ
    const newIndex = parseInt(e.target.value, 10);
    setCurrentIndex(newIndex);
  };



  // --- テキスト解析 ---

  // TinySegmenterインスタンス
  const segmenterRef = useRef(new TinySegmenter());

  // 補助関数: 助詞を前の要素に統合
  const mergeParticles = (tokens, particles) => {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      if (i > 0 && particles.includes(tokens[i])) {
        // 前の要素に結合
        result[result.length - 1] += tokens[i];
      } else {
        result.push(tokens[i]);
      }
    }
    return result;
  };

  // 補助関数: 句読点を統合
  const mergePunctuation = (tokens, prefixPunct, suffixPunct) => {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // 後ろに結合する記号の場合
      if (prefixPunct.includes(token)) {
        // 次の要素と結合
        if (i + 1 < tokens.length) {
          result.push(token + tokens[i + 1]);
          i++; // 次の要素をスキップ
        } else {
          result.push(token);
        }
      }
      // 前に結合する記号の場合
      else if (suffixPunct.includes(token)) {
        if (result.length > 0) {
          result[result.length - 1] += token;
        } else {
          result.push(token);
        }
      }
      else {
        result.push(token);
      }
    }
    return result;
  };

  // 補助関数: maxCharLengthまで結合（1単語は分割しない）
  const mergeUpToMaxLength = (tokens, maxLength) => {
    const result = [];
    let current = '';
    
    // 文節の終端を示す記号（これらで終わる場合は次と結合しない）
    const SENTENCE_TERMINATORS = ['」', '』', '）', '】', '。', '、'];
    
    // 文節の開始を示す記号（これらは必ず先頭になる）
    const SENTENCE_STARTERS = ['「', '『', '（', '【'];
    
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      
      // トークンに「が含まれていて、それが先頭でない場合は「の前で分割
      const openQuotePos = token.indexOf('「');
      if (openQuotePos > 0) {
        // 「の前と後で分割
        const beforeQuote = token.substring(0, openQuotePos);
        const fromQuote = token.substring(openQuotePos);
        
        // 前半部分を処理
        if (beforeQuote) {
          if (current) {
            result.push(current);
            current = '';
          }
          result.push(beforeQuote);
        }
        
        // 後半部分を新しいトークンとして処理
        token = fromQuote;
      }
      
      // 現在のトークンが既にmaxLengthより長い場合は、そのまま追加（単語の保護）
      if (token.length > maxLength) {
        if (current) {
          result.push(current);
          current = '';
        }
        result.push(token);
        continue;
      }
      
      // 現在のチャンクに開き括弧が含まれており、先頭でない場合は分割
      const starterIndex = SENTENCE_STARTERS.findIndex(starter => current.includes(starter));
      if (starterIndex !== -1 && current.length > 0 && !SENTENCE_STARTERS.includes(current[0])) {
        // 開き括弧の位置を見つける
        const starter = SENTENCE_STARTERS[starterIndex];
        const starterPos = current.indexOf(starter);
        if (starterPos > 0) {
          // 開き括弧の前で分割
          result.push(current.substring(0, starterPos));
          current = current.substring(starterPos);
        }
      }
      
      // 結合しても超えない場合
      if (current.length + token.length <= maxLength) {
        current += token;
      } else {
        // 超える場合は現在のチャンクを確定
        if (current) {
          result.push(current);
        }
        current = token;
      }
      
      // 「」が含まれていて、それが末尾以外にある場合は、その位置で分割
      const closeQuotePos = current.indexOf('」');
      if (closeQuotePos !== -1 && closeQuotePos < current.length - 1) {
        // 「」の位置で分割（「」を含む）
        const beforeClose = current.substring(0, closeQuotePos + 1);
        const afterClose = current.substring(closeQuotePos + 1);
        
        result.push(beforeClose);
        current = afterClose;
      }
      
      // 現在のチャンクが終端記号で終わっている場合は、次と結合しない
      const endsWithTerminator = SENTENCE_TERMINATORS.some(term => current.endsWith(term));
      if (endsWithTerminator && current.length > 0) {
        result.push(current);
        current = '';
      }
    }
    
    if (current) {
      result.push(current);
    }
    
    return result;
  };

  useEffect(() => {
    if (!inputText) {
      setWords([]);
      return;
    }

    // 入力が変わったら停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);

    try {
      let rawChunks = [];

      if (groupingMode === 'word') {
        // 単語モード: TinySegmenter
        rawChunks = segmenterRef.current.segment(inputText).filter(s => s.trim().length > 0);
      } else {
        // 文節モード: TinySegmenterベースの高度な統合ロジック
        
        // 助詞リスト
        const PARTICLES = ['は', 'が', 'を', 'に', 'へ', 'と', 'で', 'から', 'より', 'まで', 'や', 'の', 'も'];
        
        // 必ず前に結合する記号（文字数カウント外）
        const SUFFIX_PUNCTUATION = ['、', '。', '」', '』', '）', '】'];
        
        // 必ず後ろに結合する記号
        const PREFIX_PUNCTUATION = ['「', '『', '（', '【'];
        
        // ステップ1: TinySegmenterで分割
        let tokens = segmenterRef.current.segment(inputText).filter(s => s.trim().length > 0);
        
        // ステップ2: 助詞を前の要素に統合
        tokens = mergeParticles(tokens, PARTICLES);
        
        // ステップ3: 句読点を統合
        tokens = mergePunctuation(tokens, PREFIX_PUNCTUATION, SUFFIX_PUNCTUATION);
        
        // ステップ4: maxCharLengthまで結合（ただし1単語は分割しない）
        tokens = mergeUpToMaxLength(tokens, maxCharLength);
        
        rawChunks = tokens;
      }

      // カスタム単語の結合処理 (カムパネルラなど)
      const CUSTOM_WORDS = ['カムパネルラ'];

      // チャンクに位置情報を付与
      let currentPos = 0;
      let chunkObjects = rawChunks.map(c => {
        const obj = { surface: c, start: currentPos, end: currentPos + c.length };
        currentPos += c.length;
        return obj;
      });

      // カスタム単語の範囲を特定
      const customWordRanges = [];
      CUSTOM_WORDS.forEach(word => {
        let pos = inputText.indexOf(word);
        while (pos !== -1) {
          customWordRanges.push({ start: pos, end: pos + word.length, word });
          pos = inputText.indexOf(word, pos + 1);
        }
      });
      customWordRanges.sort((a, b) => a.start - b.start);

      // 結合処理
      if (customWordRanges.length > 0) {
        let newChunks = [];
        let i = 0;
        while (i < chunkObjects.length) {
          const c = chunkObjects[i];
          // このチャンクがカスタム単語の範囲と重なっているか
          const range = customWordRanges.find(r =>
            (c.start >= r.start && c.start < r.end) ||
            (c.end > r.start && c.end <= r.end) ||
            (c.start <= r.start && c.end >= r.end)
          );

          if (range) {
            // 範囲の開始を含むチャンクから、範囲の終了を含むチャンクまでを探す
            let mergedSurface = c.surface;
            let j = i + 1;

            while (j < chunkObjects.length) {
              const nextC = chunkObjects[j];
              // 次のチャンクもこのrangeと被っているか？
              // (range.endより前で始まっているなら被っているとみなす)
              if (nextC.start < range.end) {
                mergedSurface += nextC.surface;
                j++;
              } else {
                break;
              }
            }

            newChunks.push(mergedSurface);
            i = j;
          } else {
            newChunks.push(c.surface);
            i++;
          }
        }
        rawChunks = newChunks;
      }

      // 「っ」で終わるチャンクの後処理: 次のチャンクの1文字目を奪う
      const processSmallTsuEndings = (chunks) => {
        const result = [];
        for (let i = 0; i < chunks.length; i++) {
          const current = chunks[i];
          const next = i < chunks.length - 1 ? chunks[i + 1] : null;
          
          // 現在のチャンクが「っ」で終わっていて、次のチャンクが存在する場合
          if (current.endsWith('っ') && next && next.length > 0) {
            // 次のチャンクの1文字目を奪う
            result.push(current + next[0]);
            // 次のチャンクから1文字目を削除
            chunks[i + 1] = next.slice(1);
          } else {
            result.push(current);
          }
        }
        // 空のチャンクを除外
        return result.filter(c => c.length > 0);
      };

      rawChunks = processSmallTsuEndings(rawChunks);

      setWords(rawChunks);
      setCurrentIndex(0);

    } catch (e) {
      setWords(inputText.split(/[\s　]+/));
    }

  }, [inputText, groupingMode, maxCharLength]);





  // --- UI操作ヘルパー ---

  // 初期ロード時にサンプルテキスト1を読み込む
  useEffect(() => {
    const loadInitialText = async () => {
      const text = await loadTextFromFile('sample_text_1.txt');
      if (text) {
        setInputText(text);
      }
    };
    loadInitialText();
  }, []);

  const loadSampleText = async (filename) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);

    const text = await loadTextFromFile(filename);
    if (text) {
      setInputText(text);
    }
  };



  const handleInputChange = (e) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setInputText(e.target.value);
  };







  // ----------------------------------------------------------------

  // コンポーネント群

  // ----------------------------------------------------------------



  // レトロなボタン

  const RetroButton = ({ onClick, children, className = "", disabled = false }) => (

    <button

      onClick={onClick}

      disabled={disabled}

      className={`

        px-2 py-1 bg-[#eeeeee] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] 

        active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white

        text-xs text-black font-["MS_PGothic"] select-none active:bg-[#e0e0e0]

        ${className}

        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}

      `}

    >

      {children}

    </button>

  );



  const currentWord = words[currentIndex];



  // RSVP表示要素の生成ロジック

  const renderRsvpWord = () => {

    const word = currentWord;

    if (!word) {

      if (theme === 'modern') return <div className="text-gray-400 font-sans">Waiting...</div>;

      return <div className="text-[#00ff00] animate-pulse font-mono">Waiting for data...</div>;

    }



    // 句読点・記号を除外して中心を計算
    // 末尾の句読点や括弧を除外
    const trailingPunctuationRegex = /[。、！？」』）】,.!?)\]}>]+$/;
    // 先頭の開き括弧を除外
    const leadingPunctuationRegex = /^[「『（【\[{(<]+/;

    // 有効な文字列（句読点を除外した部分）を取得
    let effectiveWord = word.replace(trailingPunctuationRegex, '').replace(leadingPunctuationRegex, '');

    // 有効な文字列が空の場合は元の単語を使用
    if (effectiveWord.length === 0) {
      effectiveWord = word;
    }

    // 有効な文字列の開始位置を計算
    const leadingMatch = word.match(leadingPunctuationRegex);
    const leadingLength = leadingMatch ? leadingMatch[0].length : 0;

    // 有効な文字列の中心インデックスを計算
    const effectiveCenterIndex = Math.floor(effectiveWord.length / 2);

    // 元の文字列における実際の中心位置
    const centerIndex = leadingLength + effectiveCenterIndex;

    const pre = word.slice(0, centerIndex);

    const center = word[centerIndex];

    const post = word.slice(centerIndex + 1);



    if (theme === 'modern') {

      return (

        <div className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight z-0 relative whitespace-nowrap font-['Zen_Maru_Gothic',_sans-serif]">

          <span className="text-slate-600">{pre}</span>

          <span className="text-rose-400 inline-block">{center}</span>

          <span className="text-slate-600">{post}</span>



          <div className="absolute top-[-10px] left-1/2 w-[3px] h-[8px] bg-rose-300 rounded-full transform -translate-x-1/2 opacity-60"></div>

          <div className="absolute bottom-[-10px] left-1/2 w-[3px] h-[8px] bg-rose-300 rounded-full transform -translate-x-1/2 opacity-60"></div>

        </div>

      );

    } else {

      return (

        <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#00ff00] font-mono tracking-tight z-0 relative whitespace-nowrap" style={{ textShadow: "0 0 5px #00ff00" }}>

          <span>{pre}</span>

          <span className="text-[#ff00ff]" style={{ textShadow: "0 0 5px #ff00ff" }}>{center}</span>

          <span>{post}</span>

        </div>

      );

    }

  };



  // 統計情報の計算

  const totalChars = inputText.length;

  const min = Math.floor(elapsedTime / 60);

  const sec = Math.floor(elapsedTime % 60);

  const timeDisplay = `${min}:${String(sec).padStart(2, '0')}`;



  return (

    <div className="min-h-screen bg-[#ffdde6] font-['MS_PGothic','Osaka',sans-serif] text-[#333333] relative transition-colors duration-300">

      {/* Webフォント読み込み (Zen Maru Gothic) */}

      <style>

        {`

          @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&display=swap');

          



          .blink { animation: blinker 1s linear infinite; }

          @keyframes blinker { 50% { opacity: 0; } }

          /* スクロールバー */

          ::-webkit-scrollbar { width: 12px; }

          ::-webkit-scrollbar-track { background: #eeeeee; border-left: 1px solid #cccccc; }

          ::-webkit-scrollbar-thumb { background: #c1c1c1; border: 1px solid #ffffff; box-shadow: inset 1px 1px #f0f0f0, inset -1px -1px #909090; }

        `}

      </style>



      {/* CSSのみで背景パターン */}

      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{

        backgroundImage: `radial-gradient(#ff69b4 1px, transparent 1px)`,

        backgroundSize: '20px 20px'

      }}></div>







      <div className="max-w-[800px] mx-auto p-2 bg-white/90 border-4 border-double border-[#ff69b4] shadow-[5px_5px_0px_0px_rgba(255,105,180,0.5)] relative z-10">



        {/* タイトルバナー */}

        <div className="text-center bg-[#ffe4e1] border-2 border-dashed border-[#ff1493] p-4 mb-4">

          <h1 className="text-4xl font-bold text-[#ff1493] drop-shadow-[2px_2px_0px_#ffffff] mb-2 flex justify-center items-center gap-2 flex-wrap">
            <span role="img" aria-label="Eggplant emoji" className="text-2xl">🍆</span>
            凝視リーダー
            <span role="img" aria-label="Tiger emoji" className="text-2xl">🐯</span>
          </h1>
          <p className="text-xs text-[#ff0000] font-bold blink">
            Wait a moment... Loading... Now Loading...
          </p>
        </div>

        {/* 2カラムレイアウト */}
        <div className="flex flex-col md:flex-row gap-2">





          {/* メインコンテンツ */}

          <div className="flex-1 bg-white border-2 border-[#cccccc] p-2 min-w-0">

            <h2 className="bg-[#eeeeee] border-l-4 border-[#ff1493] pl-2 text-sm font-bold mb-4 text-[#333333] flex items-center">

              RSVP Reader Ver.0.7.10

            </h2>



            {/* RSVP画面 */}

            <div className={`

              relative h-40 flex items-center justify-center overflow-hidden mb-4 shadow-inner transition-all

              ${theme === 'modern'

                ? 'bg-white border-2 border-gray-200 rounded-2xl shadow-sm'

                : 'bg-black border-[6px] border-[#808080] border-t-[#d0d0d0] border-l-[#d0d0d0]'

              }

            `}>

              {theme !== 'modern' && (

                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>

              )}



              {renderRsvpWord()}



              <div className={`

                absolute top-2 right-3 text-xs font-mono flex flex-col items-end leading-tight gap-0.5

                ${theme === 'modern' ? 'text-gray-400' : 'text-[#00ff00]'}

              `}>

                <span>CHUNK: {String(currentIndex + 1).padStart(3, '0')} / {String(words.length).padStart(3, '0')}</span>

                <span>CHARS: {totalChars}</span>

                <span>TIME : {timeDisplay}</span>

              </div>

            </div>



            {/* コントロールエリア */}

            <div className="bg-[#c0c0c0] p-1 border-2 border-white border-b-gray-600 border-r-gray-600 mb-4">

              <div className="flex justify-between items-center bg-[#ff1493] px-1 mb-1">

                <span className="text-white text-xs font-bold">Control Panel</span>

              </div>



              <div className="p-2 flex flex-col gap-2">

                <div className="relative">

                  <input

                    type="range"

                    min="0"

                    max={words.length > 0 ? words.length - 1 : 0}

                    value={currentIndex}

                    onChange={handleProgressChange}

                    className="w-full h-4 bg-white border border-gray-600 accent-[#ff1493] cursor-pointer"

                  />

                  <div className="text-[10px] text-gray-600 font-mono text-center mt-0.5">

                    ※スライダー操作で停止・リセット・移動ができます

                  </div>

                </div>



                <div className="flex justify-center items-center flex-wrap gap-2 mt-1">

                  <div className="flex gap-1">

                    <RetroButton onClick={startPlay} disabled={isPlaying || words.length === 0 || currentIndex >= words.length}>

                      <Play size={14} className="inline mr-1" />

                      PLAY

                    </RetroButton>

                    <RetroButton onClick={stopPlay} disabled={!isPlaying}>

                      <X size={14} className="inline mr-1" />

                      STOP

                    </RetroButton>

                  </div>



                  <div className="flex items-center gap-2 bg-white border border-gray-500 px-2 py-1 shadow-inner">

                    <span className="text-xs font-mono">WPM:</span>

                    <span className="text-sm font-bold font-mono text-red-600 w-8 text-right">{wpm}</span>

                  </div>

                </div>

              </div>

            </div>



            {/* 設定エリア */}

            <div className="mb-4 bg-[#fff5f7] border border-[#ff69b4] p-2 text-xs">

              <fieldset className="border border-[#ffb6c1] p-2 mb-2">

                <legend className="text-[#ff1493] font-bold px-1">毎分あたりの単語の数 (WPM)</legend>

                <div className="flex items-center gap-2">

                  <span>ヽ(´ー｀)ノﾏﾀｰﾘ</span>

                  <input

                    type="range" min="100" max="1000" step="25"

                    value={wpm} onChange={(e) => setWpm(Number(e.target.value))}

                    className="flex-1"

                  />

                  <span>(((((((((((っ･ω･)っ ﾌﾞｰﾝ</span>

                </div>

              </fieldset>



              <fieldset className="border border-[#ffb6c1] p-2">

                <legend className="text-[#ff1493] font-bold px-1">表示設定</legend>



                <div className="mb-3 pb-3 border-b border-dashed border-gray-400">

                  <span className="font-bold block mb-1 text-[#ff1493]">■ テーマ (見た目)</span>

                  <div className="flex gap-2">

                    <label className="cursor-pointer flex items-center gap-1">

                      <input

                        type="radio"

                        checked={theme === 'retro'}

                        onChange={() => setTheme('retro')}

                      />

                      レトロ

                    </label>

                    <label className="cursor-pointer flex items-center gap-1">

                      <input

                        type="radio"

                        checked={theme === 'modern'}

                        onChange={() => setTheme('modern')}

                      />

                      モダン(丸ゴシック)

                    </label>

                  </div>

                </div>



                <div>

                  <span className="font-bold block mb-1 text-[#ff1493]">■ 区切り方(諸々の設定は再生を停止して、別の本を読み込むと反映されます。難しかったのでごめん！！)</span>

                  <div className="flex gap-2 mb-2">

                    <label className="cursor-pointer flex items-center gap-1">

                      <input

                        type="radio"

                        checked={groupingMode === 'word'}

                        onChange={() => setGroupingMode('word')}

                      />

                      単語ごと

                    </label>

                    <label className="cursor-pointer flex items-center gap-1">

                      <input

                        type="radio"

                        checked={groupingMode === 'bunsetsu'}

                        onChange={() => setGroupingMode('bunsetsu')}

                      />

                      文節ごと

                    </label>

                  </div>

                  {groupingMode === 'bunsetsu' && (

                    <div className="flex items-center gap-2 bg-white p-1 border border-dotted border-gray-400">

                      <span>1回あたりの最大文字数(長い単語は強制表示するよ): {maxCharLength}</span>

                      <input

                        type="range" min="2" max="15"

                        value={maxCharLength}

                        onChange={(e) => setMaxCharLength(Number(e.target.value))}

                        className="w-20"

                      />

                    </div>

                  )}

                </div>

              </fieldset>



              <div className="mt-3 pt-3 border-t border-dashed border-gray-400 text-[#333333]">


              </div>



            </div>



            <div className="mb-2 flex flex-wrap gap-1">

              <RetroButton onClick={() => loadSampleText('sample_text_1.txt')}>手袋を買いに</RetroButton>

              <RetroButton onClick={() => loadSampleText('sample_text_3.txt')}>銀河鉄道の夜</RetroButton>

              <RetroButton onClick={() => loadSampleText('sample_text_2.txt')}>ルイズ</RetroButton>

            </div>



            <div className="mb-4">

              <div className="text-xs mb-1 font-bold text-[#ff1493]">↓ここに文章を入れてね↓</div>

              <textarea

                value={inputText}

                onChange={handleInputChange}

                className="w-full h-32 p-2 text-sm border-2 border-inset border-[#cccccc] bg-[#fffaf0] font-mono text-[#333333] focus:bg-white focus:outline-none"

              />

            </div>





            {/* 下部AAエリア + 解説 */}

            <div className="flex flex-col md:flex-row justify-center items-center gap-4 my-6 p-4 bg-white/40 rounded-xl backdrop-blur-sm border border-white/50">

              <div className="text-left font-['MS_PGothic','Osaka',sans-serif] text-xs leading-[0.5] whitespace-pre overflow-x-auto shrink-0 opacity-90 text-gray-800">

                {`

 　　　 　　／⌒ヽ

 　　　 　/ ・ω・＼　＜ 肉人間の眼球運動は

 　　　＿|　⊃／(＿＿_　　あまりに非効率だね…

 　　／　└-(＿＿＿_／

 　　￣￣￣￣￣￣￣



 　 ∧＿∧

 　（　・∀・）＜ 通常は分速400〜600文字…

 　（　　　　）　 でもRSVPなら1000文字も

 　｜ ｜　| 　　余裕でインプット可能！

 　（_＿）＿）  また水槽の脳に一歩近づける！

`}

              </div>



              <div className="text-xs text-[#333] max-w-lg font-sans leading-relaxed">

                <strong className="inline-block mb-1 text-[#ff1493] border-b border-[#ff1493]">★ RSVP（Rapid Serial Visual Presentation）とは？</strong>

                <br />

                画面の定位置に単語を高速で連続表示する技術です。

                通常の読書で発生する眼球移動（サッケード）の時間を極限まで削減し、

                視線を固定したまま情報を脳へ直接インプットします。

                慣れれば分速1000文字以上の長速読も可能なんだって。すごいねー。

                <br />

              </div>

            </div>



          </div>

        </div>



        {/* 著作権表示の変更 */}

        <div className="text-center text-[10px] mt-2 text-[#ff69b4] font-['MS_PGothic']">

          (C) ひかりごけ / Designed by @koba_sota78411/Since 2025.11.26

        </div>

      </div>





    </div>

  );

}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadDefaultJapaneseParser } from 'budoux';

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



  // ★ テーマ管理

  const [theme, setTheme] = useState('modern');











  const [elapsedTime, setElapsedTime] = useState(0);



  const [updateCounter, setUpdateCounter] = useState(0); // 強制更新用







  // ロジック制御用 Ref

  const nextWordTimeRef = useRef(0);

  const indexRef = useRef(0);

  const wordsRef = useRef([]);

  const wpmRef = useRef(wpm);

  const startTimeRef = useRef(0);

  const accumulatedTimeRef = useRef(0);



  // ★ 確実な停止制御のためのRef

  const isPlayingRef = useRef(false);



  // --- Ref同期 ---

  useEffect(() => { wordsRef.current = words; }, [words]);

  useEffect(() => { wpmRef.current = wpm; }, [wpm]);



  // ★ isPlayingの状態をRefに常に同期させる

  useEffect(() => {

    isPlayingRef.current = isPlaying;

  }, [isPlaying]);



  // =================================================================

  // ★ 再生ループ制御 (Refによるガード付き) ★

  // =================================================================

  useEffect(() => {

    // 停止中なら何もしない

    if (!isPlaying) {

      return;

    }



    let animationFrameId;



    // ループ関数

    const loop = (timestamp) => {

      // ★ 最重要修正: Refを使って「現在の」再生状態を確認してガードする

      // Reactのクロージャの性質上、ループ内の isPlaying 変数は true のまま固定される恐れがあるため、

      // 常に最新の値を持つ Ref を参照して停止判定を行う。

      if (!isPlayingRef.current) {

        return;

      }



      // 基準時間の初期化

      if (startTimeRef.current === 0) {

        startTimeRef.current = timestamp;

      }



      const currentWpm = wpmRef.current;

      const currentWords = wordsRef.current;

      const intervalMs = 60000 / currentWpm;



      // 経過時間の計算と更新

      const totalElapsedTime = accumulatedTimeRef.current + (timestamp - startTimeRef.current);

      setElapsedTime(totalElapsedTime / 1000);



      // 次の単語を表示する時間の初期化

      if (nextWordTimeRef.current === 0) {

        nextWordTimeRef.current = timestamp + intervalMs;

      }



      // 時間が来たら次の単語へ

      if (timestamp >= nextWordTimeRef.current) {

        const nextIndex = indexRef.current + 1;



        if (nextIndex < currentWords.length) {

          indexRef.current = nextIndex;

          setUpdateCounter(c => c + 1); // 画面更新トリガー

          nextWordTimeRef.current += intervalMs;



          // 遅延補正: ブラウザバックグラウンドなどで時間が飛びすぎていたら現在時刻に同期

          if (timestamp > nextWordTimeRef.current + intervalMs) {

            nextWordTimeRef.current = timestamp + intervalMs;

          }

        } else {

          // 最後まで到達したら停止処理

          setIsPlaying(false);

          // Refも更新しておく（useEffectの同期を待たずに即時反映するため）

          isPlayingRef.current = false;

          indexRef.current = 0;

          accumulatedTimeRef.current = 0;

          setElapsedTime(0);

          setUpdateCounter(c => c + 1);

          return; // ここでリターンしてループ終了

        }

      }



      // 次のフレームを予約

      animationFrameId = requestAnimationFrame(loop);

    };



    // ループ開始

    animationFrameId = requestAnimationFrame(loop);



    // ★ クリーンアップ関数

    return () => {

      // アニメーションフレームを確実にキャンセル

      cancelAnimationFrame(animationFrameId);



      // 経過時間を保存して、開始時間をリセット

      if (startTimeRef.current !== 0) {

        accumulatedTimeRef.current += performance.now() - startTimeRef.current;

        startTimeRef.current = 0;

      }

    };

  }, [isPlaying]); // isPlaying の変化のみを監視する





  // --- 再生開始 ---

  const startPlay = () => {

    if (words.length > 0 && indexRef.current < words.length && !isPlaying) {

      startTimeRef.current = 0;

      setIsPlaying(true);

      // RefはuseEffectで同期されるが、念のためここでもセット

      isPlayingRef.current = true;

    }

  };



  // --- シーク操作 ---

  const handleProgressChange = (e) => {

    setIsPlaying(false);

    isPlayingRef.current = false;

    const newIndex = parseInt(e.target.value, 10);

    indexRef.current = newIndex;

    accumulatedTimeRef.current = 0;

    setElapsedTime(0);

    setUpdateCounter(c => c + 1);

  };



  // --- テキスト解析 ---

  // --- テキスト解析 ---

  const [parser, setParser] = useState(null);

  // BudouXの初期化
  useEffect(() => {
    const p = loadDefaultJapaneseParser();
    setParser(p);
  }, []);

  useEffect(() => {
    if (!inputText) {
      setWords([]);
      return;
    }

    // 入力が変わったら停止
    setIsPlaying(false);
    isPlayingRef.current = false;

    try {
      let rawChunks = [];

      // 単語分割用のSegmenter (共通で使用)
      const segmenter = new Intl.Segmenter("ja-JP", { granularity: "word" });

      if (groupingMode === 'word') {
        // 単語モード: Intl.Segmenter
        // segment() returns an iterable, convert to array of strings
        rawChunks = Array.from(segmenter.segment(inputText)).map(s => s.segment).filter(s => s.trim().length > 0);
      } else {
        // 文節モード: BudouX
        let initialChunks = [];
        if (parser) {
          initialChunks = parser.parse(inputText);
        } else {
          // パーサー未ロード時は簡易分割
          initialChunks = inputText.split(/[\s　]+/);
        }

        // ★ 長さ制限ロジックの復活
        // BudouXのチャンクが maxCharLength を超える場合、Intl.Segmenterでさらに細かく分割して再構成する
        rawChunks = [];

        initialChunks.forEach(chunk => {
          if (chunk.length <= maxCharLength) {
            rawChunks.push(chunk);
          } else {
            // 長すぎる場合、単語単位に分解
            const words = Array.from(segmenter.segment(chunk)).map(s => s.segment);

            let buffer = "";
            words.forEach(word => {
              // バッファに追加しても制限内なら追加
              if ((buffer + word).length <= maxCharLength) {
                buffer += word;
              } else {
                // 制限を超える場合
                if (buffer.length > 0) {
                  // 既存バッファをフラッシュ
                  rawChunks.push(buffer);
                  buffer = word;
                } else {
                  // バッファが空（つまり単語単体で制限を超えている）場合
                  // 仕方ないのでその単語をそのまま出す（あるいは文字単位で切る手もあるが、一旦これで）
                  rawChunks.push(word);
                  buffer = "";
                }
              }
            });
            if (buffer.length > 0) {
              rawChunks.push(buffer);
            }
          }
        });
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

      setWords(rawChunks);
      indexRef.current = 0;
      accumulatedTimeRef.current = 0;
      setElapsedTime(0);
      setUpdateCounter(c => c + 1);

    } catch (e) {

      setWords(inputText.split(/[\s　]+/));
    }

  }, [inputText, groupingMode, parser]);





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

    setIsPlaying(false);

    isPlayingRef.current = false;

    const text = await loadTextFromFile(filename);
    if (text) {
      setInputText(text);
    }

  };



  const handleInputChange = (e) => {

    setIsPlaying(false);

    isPlayingRef.current = false;

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



  const currentWord = words[indexRef.current];



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

                <span>CHUNK: {String(indexRef.current + 1).padStart(3, '0')} / {String(words.length).padStart(3, '0')}</span>

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

                    value={indexRef.current}

                    onChange={handleProgressChange}

                    className="w-full h-4 bg-white border border-gray-600 accent-[#ff1493] cursor-pointer"

                  />

                  <div className="text-[10px] text-gray-600 font-mono text-center mt-0.5">

                    ※スライダー操作で停止・リセット・移動ができます

                  </div>

                </div>



                <div className="flex justify-center items-center flex-wrap gap-2 mt-1">

                  <div className="flex gap-1">

                    <RetroButton onClick={startPlay} disabled={isPlaying || words.length === 0 || indexRef.current >= words.length}>

                      <Play size={14} className="inline mr-1" />

                      PLAY

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

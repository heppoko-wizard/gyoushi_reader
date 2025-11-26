import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Play, X, Settings, Monitor, Type } from 'lucide-react';



// --- サンプルテキスト定義 ---

const SAMPLE_TEXT_1 = `手袋を買いに

新美南吉



寒い冬が北方から、狐の親子の棲んでいる森へもやって来ました。

或朝洞穴から子供の狐が出ようとしましたが、「あっ」と叫んで眼を抑えながら母さん狐のところへころげて来ました。

「母ちゃん、眼に何か刺さった、ぬいて頂戴早く早く」と言いました。

母さん狐がびっくりして、あわてふためきながら、眼を抑えている子供の手を恐る恐るとりのけて見ましたが、何も刺さってはいませんでした。母さん狐は洞穴の入口から外へ出て始めてわけが解りました。昨夜のうちに、真白な雪がどっさり降ったのです。その雪の上からお陽さまがキラキラと照していたので、雪は眩しいほど反射していたのです。雪を知らなかった子供の狐は、あまり強い反射をうけたので、眼に何か刺さったと思ったのでした。`;



const SAMPLE_TEXT_2 = `ルイズ！ルイズ！ルイズ！ルイズぅぅうううわぁああああああああああああああああああああああん！！！

あぁああああ…ああ…あっあっー！あぁああああああ！！！ルイズルイズルイズぅううぁわぁああああ！！！

あぁクンカクンカ！クンカクンカ！スーハースーハー！スーハースーハー！いい匂いだなぁ…くんくん

んはぁっ！ルイズ・フランソワーズたんの桃色ブロンドの髪をクンカクンカしたいお！クンカクンカ！あぁあ！！

間違えた！モフモフしたいお！モフモフ！モフモフ！髪髪モフモフ！カリカリモフモフ…きゅんきゅんきゅい！！

小説12巻のルイズたんかわいかったよぅ！！あぁぁああ…あああ…あっあぁああ！ふぁぁあああんんっ！！

コミック2巻はドグケインだよぅ！！にゃあぁああああああああああああああああああああああああ！`;



const SAMPLE_TEXT_3 = `銀河鉄道の夜

宮沢賢治



「ではみなさんは、そういうふうに川だと云われたり、乳の流れたあとだと云われたりしていたこのぼんやりと白いものがほんとうは何かご承知ですか。」先生は、黒板に吊した大きな黒い星座の図の、上から下へ白くけぶった銀河帯のようなところを指しながら、みんなに問をかけました。

カムパネルラが手をあげました。それから四、五人手をあげました。ジョバンニも手をあげようとして、急いでそのままやめました。たしかにあれはみんな星だと、いつか雑誌で読んだのでしたが、このごろはジョバンニはまるで毎日教室でもねむく、本を読むひまも読む本もないので、なんだかどんなこともよくわからないという気がするのでした。`;



// --- トラップテキスト定義 ---

const TRAP_BURBON_HOUSE = `

　　　 ∧＿＿∧　やあ

　　 （´・ω・｀)　　　　　 /

　　／::∇y:::::＼　　　[￣￣]

  |:::⊃:|:::::|      |──|

￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣|

￣￣￣￣￣￣￣￣￣￣￣￣￣￣ |￣￣

￣￣￣￣￣￣￣￣￣￣￣￣￣￣ |

　　　　∇　∇　∇　∇　  ／ |

　　　　┴　┴　┴　┴　／ ／|

￣￣￣￣￣￣￣￣￣￣￣￣|／　|

￣￣￣￣￣￣￣￣￣￣￣￣　　 |

　　(⊆⊇)　(⊆⊇)　(⊆⊇)　 |

  　||　　　||　　　||　　 |

やあ （´・ω・｀)



ようこそ、バーボンハウスへ。



このバーボンはサービスだから、まず飲んで落ち着いて欲しい。



うん、「また」なんだ。済まない。



仏の顔もって言うしね、謝って許してもらおうとも思っていない。



でも、このリンクを見たとき、君は、きっと言葉では言い表せない



「きらめき」みたいなものを感じてくれたと思う。



殺伐とした世の中で、そういう気持ちを忘れないで欲しい



そう思って、このページを立てたんだ。



じゃあ、馴れ合いは禁止だ。

`;



export default function App() {

  // --- 状態と参照の定義 ---

  // UI表示用

  const [inputText, setInputText] = useState(SAMPLE_TEXT_1);

  const [words, setWords] = useState([]);

  const [isPlaying, setIsPlaying] = useState(false);

  const [wpm, setWpm] = useState(300); 

  const [groupingMode, setGroupingMode] = useState('bunsetsu'); 

  const [maxCharLength, setMaxCharLength] = useState(4);

  

  // ★ テーマ管理

  const [theme, setTheme] = useState('modern'); 

  

  const [showTrap, setShowTrap] = useState(false);

  const [trapContent, setTrapContent] = useState(''); 

  

  // ★ カウンター: 固定値

  const [hitCount] = useState(373737);

  

  const [elapsedTime, setElapsedTime] = useState(0); 

  

  const [updateCounter, setUpdateCounter] = useState(0); // 強制更新用



  // ★ Linkメニューの開閉状態

  const [isLinkOpen, setIsLinkOpen] = useState(false);



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

  useEffect(() => {

    if (!inputText) {

      setWords([]);

      return;

    }

    // 入力が変わったら停止

    setIsPlaying(false);

    isPlayingRef.current = false;

    

    try {

      if (typeof Intl.Segmenter !== 'function') throw new Error("Intl.Segmenter not supported");

      const segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });

      const rawSegments = Array.from(segmenter.segment(inputText)).map(s => s.segment);

      let processedWords = [];

      if (groupingMode === 'word') {

        processedWords = rawSegments.filter(s => s.trim().length > 0);

      } else {

        let buffer = "";

        const isClosingChars = (str) => /^[、。,.?!！？」』)）>\]}】]+$/.test(str.trim());

        const isOpenChars = (str) => /^[「『(（<\[{【]+$/.test(str.trim());

        const isConnector = (str) => /^([ぁ-んー]+|[、。,.?!！？」』)）>\]}】]+)$/.test(str.trim());



        rawSegments.forEach((seg) => {

          const s = seg.trim();

          if (s.length === 0) return;

          if (buffer === "") {

            buffer = s;

          } else {

            const willExceedLimit = (buffer.length + s.length) > maxCharLength;

            const isNextClosing = isClosingChars(s);

            const isNextConnector = isConnector(s);

            const bufferIsOnlyOpenChars = isOpenChars(buffer);

            const isNextOpenChar = isOpenChars(s); 

            if (isNextClosing) {

              buffer += s;

            } else if (bufferIsOnlyOpenChars) {

               buffer += s;

            } else if (isNextOpenChar) {

               processedWords.push(buffer);

               buffer = s;

            } else if (isNextConnector && !willExceedLimit) {

              buffer += s;

            } else {

              processedWords.push(buffer);

              buffer = s;

            }

          }

        });

        if (buffer) processedWords.push(buffer);

      }

      setWords(processedWords);

      indexRef.current = 0;

      accumulatedTimeRef.current = 0; 

      setElapsedTime(0);

      setUpdateCounter(c => c + 1); 

    } catch (e) {

      console.warn("Segmentation failed, falling back to simple split:", e);

      setWords(inputText.split(/[\s　]+/)); 

    }

  }, [inputText, groupingMode, maxCharLength]);





  // --- UI操作ヘルパー ---

  const loadSampleText = (text) => {

    setIsPlaying(false);

    isPlayingRef.current = false;

    setInputText(text);

  };



  const handleInputChange = (e) => {

    setIsPlaying(false);

    isPlayingRef.current = false;

    setInputText(e.target.value);

  };



  const handleTrap = (e) => {

    e.preventDefault();

    setTrapContent(TRAP_BURBON_HOUSE);

    setShowTrap(true);

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



    const centerIndex = Math.max(0, Math.floor(word.length / 2));

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

          

          @keyframes marquee {

            0% { transform: translateX(100%); }

            100% { transform: translateX(-100%); }

          }

          .marquee-container { overflow: hidden; white-space: nowrap; background: #ff69b4; color: yellow; font-weight: bold; border: 2px solid #ff1493; }

          .marquee-text { display: inline-block; animation: marquee 10s linear infinite; padding: 2px 0; }

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



      {/* マーキーエリア */}

      <div className="marquee-container mb-2 relative z-10">

        <div className="marquee-text">

          ★☆★ ようこそバーサナ技術開発局へ！！ ★☆★ キリ番{hitCount}踏んだ人はBBSにカキコしてね！！ ★☆★ 踏み逃げ厳禁！！

        </div>

      </div>



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

          

          {/* 左サイドバー (Menu) */}

          <div className="w-full md:w-48 bg-[#fff0f5] border-2 border-inset border-[#ff69b4] p-2 text-center h-fit shrink-0">

            <div className="bg-[#ff69b4] text-white font-bold mb-2 text-sm">☆ MENU ☆</div>

            <ul className="text-xs space-y-1 text-blue-600 underline">

              {['Top', 'Profile', 'Diary', 'BBS'].map((item) => (

                <li key={item} onClick={handleTrap} className="cursor-pointer hover:text-red-500">

                  {item}

                </li>

              ))}

              

              {/* Linkメニュー (クリックで展開) */}

              <li onClick={() => setIsLinkOpen(!isLinkOpen)} className="cursor-pointer hover:text-red-500 select-none">

                Link {isLinkOpen ? '▼' : '▶'}

              </li>

              

              {/* 展開されるリンク集 */}

              {isLinkOpen && (

                <div className="pl-2 my-1 space-y-1 text-left">

                  <li className="cursor-pointer hover:text-red-500 list-none">

                    <a href="https://twitter.com/sana_natori" target="_blank" rel="noreferrer">名取さな公式Twitter</a>

                  </li>

                  <li className="cursor-pointer hover:text-red-500 list-none">

                    <a href="https://www.youtube.com/channel/UCIdEIHpS0TdkqRkHL5OkLtA" target="_blank" rel="noreferrer">さなちゃんねる</a>

                  </li>

                </div>

              )}



              <li onClick={handleTrap} className="cursor-pointer hover:text-red-500">

                Mail

              </li>

            </ul>

            

            <div className="mt-4 mb-2">

              <div className="text-[10px] mb-1">あなたは</div>

              <div className="bg-black text-red-500 font-mono text-lg border-2 border-gray-500 inline-block px-2 tracking-widest">

                {/* 固定値の表示 */}

                {hitCount}

              </div>

              <div className="text-[10px] mt-1">人目のせんせえです</div>

            </div>



            <div className="mt-4 border-t border-dashed border-[#ff69b4] pt-2">

              <div className="text-[10px] mt-1 cursor-pointer hover:text-red-500" onClick={handleTrap}>相互リンク募集中v</div>

            </div>

          </div>



          {/* メインコンテンツ */}

          <div className="flex-1 bg-white border-2 border-[#cccccc] p-2 min-w-0">

            <h2 className="bg-[#eeeeee] border-l-4 border-[#ff1493] pl-2 text-sm font-bold mb-4 text-[#333333] flex items-center">

              <span role="img" aria-label="Sparkles emoji" className="text-yellow-500 mr-1">✨</span>

              RSVP Reader Ver.1.0

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

                    <span className="text-xs font-mono">SPD:</span>

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

                      <Monitor size={12} className="text-gray-600"/>

                      レトロ

                    </label>

                    <label className="cursor-pointer flex items-center gap-1">

                      <input 

                        type="radio" 

                        checked={theme === 'modern'} 

                        onChange={() => setTheme('modern')} 

                      />

                      <Type size={12} className="text-blue-500"/>

                      モダン(丸ゴシック)

                    </label>

                  </div>

                </div>



                <div>

                  <span className="font-bold block mb-1 text-[#ff1493]">■ 区切り方</span>

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

              <RetroButton onClick={() => loadSampleText(SAMPLE_TEXT_1)}>手袋を買いに</RetroButton>

              <RetroButton onClick={() => loadSampleText(SAMPLE_TEXT_3)}>銀河鉄道の夜</RetroButton>

              <RetroButton onClick={() => loadSampleText(SAMPLE_TEXT_2)}>ルイズコピペ</RetroButton>

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

              <div className="text-left font-['MS_PGothic','Osaka',sans-serif] text-xs leading-[1.1] whitespace-pre overflow-x-auto shrink-0 opacity-90 text-gray-800">

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

                <br/>

                画面の定位置に単語を高速で連続表示する技術です。

                通常の読書で発生する「眼球移動（サッケード）」の時間を極限まで削減し、

                視線を固定したまま情報を脳へ直接インプットします。

                慣れれば分速1000文字以上の「凝視読書」も可能。

                <br/>

              </div>

            </div>



          </div>

        </div>

        

        {/* 著作権表示の変更 */}

        <div className="text-center text-[10px] mt-2 text-[#ff69b4] font-['MS_PGothic']">

          (C) ひかりごけ / Designed by @koba_sota78411/Since 2023.11.26

        </div>

      </div>



      {/* バーボンハウス・トラップモーダル */}

      {showTrap && (

        <div 

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono text-white p-4" 

          onClick={() => setShowTrap(false)}

        >

          <div 

            className="max-w-2xl bg-black border-4 border-double border-white p-8 whitespace-pre-wrap leading-relaxed relative text-center shadow-[0_0_15px_rgba(255,255,255,0.7)]" 

            onClick={(e) => e.stopPropagation()}

          >

            <button 

              className="absolute top-2 right-2 text-white hover:text-red-500"

              onClick={() => setShowTrap(false)}

            >

              <X size={24} />

            </button>

            {/* AA表示エリア修正 */}

            <div className={`text-sm mb-4 text-red-500`}>

              <pre className="font-['MS_PGothic','Osaka',sans-serif] text-left overflow-x-auto leading-[1.1] whitespace-pre">{TRAP_BURBON_HOUSE.trim()}</pre>

            </div>

            <RetroButton onClick={() => setShowTrap(false)} className="mt-4">

              [Close]

            </RetroButton>

          </div>

        </div>

      )}

    </div>

  );

}

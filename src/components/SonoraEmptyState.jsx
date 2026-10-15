import React from 'react';
import { usePlayer } from '../context/PlayerContext';

export function SonoraEmptyState({ title, description, screenText = "EMPTY", defaultView }) {
  const { morphism } = usePlayer();

  if (morphism === 'neobrutalism') {
    return (
      <div className="uiverse-empty-state-wrapper animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-6 select-none">
        <div className="main_wrapper scale-[0.85] md:scale-100 my-[-3em]">
          <div className="main">
            <div className="antenna">
              <div className="antenna_shadow"></div>
              <div className="a1"></div>
              <div className="a1d"></div>
              <div className="a2"></div>
              <div className="a2d"></div>
              <div className="a_base"></div>
            </div>
            <div className="tv">
              <div className="cruve">
                <svg
                  className="curve_svg"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 189.929 189.929"
                  xmlSpace="preserve"
                >
                  <path
                    d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13
                C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z"
                  ></path>
                </svg>
              </div>
              <div className="display_div">
                <div className="screen_out">
                  <div className="screen_out1">
                    <div className="screen">
                      <span className="notfound_text">{screenText}</span>
                    </div>
                    <div className="screenM">
                      <span className="notfound_text">{screenText}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lines">
                <div className="line1"></div>
                <div className="line2"></div>
                <div className="line3"></div>
              </div>
              <div className="buttons_div">
                <div className="b1"><div></div></div>
                <div className="b2"></div>
                <div className="speakers">
                  <div className="g1">
                    <div className="g11"></div>
                    <div className="g12"></div>
                    <div className="g13"></div>
                  </div>
                  <div className="g"></div>
                  <div className="g"></div>
                </div>
              </div>
            </div>
            <div className="bottom">
              <div className="base1"></div>
              <div className="base2"></div>
              <div className="base3"></div>
            </div>
          </div>
          <div className="text_404">
            <div className="text_4041">?</div>
            <div className="text_4042">?</div>
            <div className="text_4043">?</div>
          </div>
        </div>
        
        <div className="ladybug-card animate-in fade-in duration-500">
          <div className="ladybug-head">
            <span>System Log</span>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56] border border-black"></span>
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e] border border-black"></span>
              <span className="w-2 h-2 rounded-full bg-[#27c93f] border border-black"></span>
            </div>
          </div>
          <div className="ladybug-content">
            <div className="font-extrabold uppercase tracking-widest text-[9px] text-black/40 mb-0.5">Notification</div>
            <div className="font-extrabold text-black text-[13px] leading-tight mb-2">{title}</div>
            {description && (
              <>
                <div className="font-extrabold uppercase tracking-widest text-[9px] text-black/40 mb-0.5 mt-2.5">Message</div>
                <div className="font-semibold text-black/85 text-[11px] leading-relaxed">{description}</div>
              </>
            )}
            <div>
              <button 
                className="ladybug-button" 
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/";
                  }
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );

  }

  if (defaultView) {
    return defaultView;
  }

  return (
    <div className="py-12 text-center animate-in fade-in duration-300">
      <p className="text-lg text-ink-300">{title}</p>
      {description && <p className="mt-2 text-sm text-ink-500">{description}</p>}
    </div>
  );
}

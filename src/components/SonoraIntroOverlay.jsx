import React, { useEffect, useRef, useState } from "react";
import p5 from "p5";

export function SonoraIntroOverlay({ onComplete, onTransitionStart }) {
  const wrapRef = useRef(null);
  const introP5Ref = useRef(null);
  const [fading, setFading] = useState(false);
  const [skipFade, setSkipFade] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let introP5 = null;

    const triggerFinish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFading(true);
      if (onTransitionStart) onTransitionStart();
      setTimeout(() => {
        if (introP5) {
          introP5.remove();
          introP5 = null;
          introP5Ref.current = null;
        }
        onComplete();
      }, 1100);
    };

    const introSketch = (p) => {
      const BUF_W = 1500, BUF_H = 650;
      let buf;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*'.split('');
      let ctx;

      // flower state (gradient green + glow white combo)
      const elements = [
        { c1:[30,215,96],  c2:[255,255,255], c3:[15,120,50],  stemC:[40,180,90],  layers:14, petalsPerLayer:9,  maxRadius:220, ruffleAmt:12, sepals:5 },
        { c1:[0,230,115],  c2:[240,255,245], c3:[20,140,65],  stemC:[45,190,100], layers:15, petalsPerLayer:10, maxRadius:215, ruffleAmt:14, sepals:6 },
        { c1:[46,204,113], c2:[250,250,255], c3:[10,100,40],  stemC:[35,160,80],  layers:13, petalsPerLayer:9,  maxRadius:225, ruffleAmt:13, sepals:5 },
      ];
      let curEl = 0, bloom = 0, bloomTarget = 1, phase = 'growing', phaseT = 0;
      let wilt = 0;
      let renderMode = 0, prevMode = 0, modeT = 1;
      let grid = 6, gridTarget = 6;
      const GRID_MIN = 6, GRID_MAX = 14;
      let densDir = 1, densTimer = 0;
      let mInfX = 0, mInfY = 0;
      let t = 0;
      let rotX = 0, rotY = 0, rotZ = 0;
      let autoRotX = 0, autoRotY = 0, autoRotZ = 0;
      let mouseRotX = 0, mouseRotY = 0, rotEaseIn = 0;
      let glitchActive = false, glitchIntensity = 0, glitchSlices = [], glitchTimer = 0;
      let finishCalled  = false;

      // ── Adaptive FPS speed multiplier ───────────────────────
      // Measures real FPS over a rolling window. If FPS < 35,
      // we run the simulation at 2× speed so animation still
      // feels fluid and completes in a reasonable time.
      const FPS_WINDOW   = 45;   // frames to average
      const FPS_LOW      = 35;   // threshold for "slow" device
      const SPEED_NORMAL = 1.0;
      const SPEED_BOOST  = 2.0;
      let   fpsHistory   = [];
      let   speedMult    = SPEED_NORMAL;

      const easeInOutCubic = x => x < 0.5 ? 4*x*x*x : 1 - p.pow(-2*x+2,3)/2;
      const easeOutQuart   = x => 1 - p.pow(1-x,4);

      function startElement(idx) {
        curEl = idx; bloom = 0; bloomTarget = 1;
        wilt = 0; phase = 'growing'; phaseT = 0;
        grid = GRID_MIN; gridTarget = GRID_MIN;
        densDir = 1; densTimer = 0; modeT = 1;
      }

      function rot3D(x, y, z) {
        const cY=p.cos(rotY),sY=p.sin(rotY); const rx=x*cY+z*sY, rz=-x*sY+z*cY;
        const cX=p.cos(rotX),sX=p.sin(rotX); const ry=y*cX-rz*sX, rz2=y*sX+rz*cX;
        const cZ=p.cos(rotZ),sZ=p.sin(rotZ); const fx=rx*cZ-ry*sZ, fy=rx*sZ+ry*cZ;
        return [fx,fy,rz2];
      }

      function triggerGlitch() {
        glitchActive = true;
        glitchIntensity = p.random(0.4,1.0);
        glitchSlices = [];
        const scaleF = p.min(p.width/BUF_W, p.height/BUF_H)*0.92;
        const rW=BUF_W*scaleF, rH=BUF_H*scaleF;
        const fOx=(p.width-rW)/2, fOy=(p.height-rH)/2;
        const numSlices = p.floor(p.random(3,9));
        for (let i=0;i<numSlices;i++) {
          const sy=p.random(fOy,fOy+rH);
          const sh=p.min(p.random(3,rH*0.09),fOy+rH-sy);
          glitchSlices.push({ y:sy, h:sh, fx:fOx, fw:rW,
            offset: p.random(-70,70)*glitchIntensity,
            colorShift: p.random()<0.4,
            duration: p.random(0.06,0.28) });
        }
      }

      function updateGlitch(dt) {
        if (!glitchActive) return;
        let allDone = true;
        for (const s of glitchSlices) {
          s.duration -= dt;
          if (s.duration>0) allDone=false;
          else s.offset *= 0.7;
        }
        if (allDone) { glitchActive=false; glitchSlices=[]; }
      }

      function drawGlitchOverlay() {
        if (!glitchActive||!glitchSlices.length) return;
        for (const s of glitchSlices) {
          if (p.abs(s.offset)<0.5) continue;
          const sx=p.floor(s.fx),sy=p.floor(s.y),sw=p.floor(s.fw),sh=p.floor(s.h);
          if (sw<1||sh<1) continue;
          if (s.colorShift) {
            ctx.save(); ctx.globalAlpha=0.7; ctx.globalCompositeOperation='lighter';
            ctx.drawImage(ctx.canvas,sx,sy,sw,sh,sx+s.offset*1.5,sy,sw,sh);
            ctx.globalAlpha=0.45;
            ctx.drawImage(ctx.canvas,sx,sy,sw,sh,sx-s.offset,sy,sw,sh);
            ctx.restore();
          } else {
            ctx.drawImage(ctx.canvas,sx,sy,sw,sh,sx+s.offset,sy,sw,sh);
          }
        }
      }

      function drawLeaf(g,x,y,side,sz,sc) {
        if (sz<2) return;
        g.push(); g.translate(x,y); g.rotate(side*0.65);
        g.fill(sc[0]*0.85,sc[1]*1.15,sc[2]*0.75);
        
        const ctx2d = g.drawingContext;
        ctx2d.beginPath();
        ctx2d.moveTo(0, 0);
        ctx2d.bezierCurveTo(sz*.35*side,-sz*.38,sz*.85*side,-sz*.22,sz*1.35*side,0);
        ctx2d.bezierCurveTo(sz*.85*side,sz*.22,sz*.35*side,sz*.38,0,0);
        ctx2d.closePath();
        ctx2d.fill();

        g.noStroke(); g.pop();
      }

      function drawStem(g,f,progress,wl,cx,cy) {
        wl=wl||0;
        const stemLen=BUF_H*0.44, stemX=cx, stemTop=cy, stemBot=stemTop+stemLen;
        const visLen=stemLen*easeOutQuart(progress), visTop=stemBot-visLen;
        for (let y=visTop;y<stemBot;y+=3) {
          const tt=(y-stemTop)/stemLen, sw=p.lerp(14,7,tt);
          const curveX=p.sin(tt*p.PI*0.3)*20+p.sin(tt*p.PI*0.8)*7;
          const r=p.lerp(f.stemC[0],f.stemC[0]*0.5,tt);
          const gc=p.lerp(f.stemC[1],f.stemC[1]*0.5,tt);
          const b=p.lerp(f.stemC[2],f.stemC[2]*0.5,tt);
          g.fill(r,gc,b); g.ellipse(stemX+curveX,y,sw,4);
        }
        if (progress>0.3) { const leafP=p.constrain((progress-0.3)/0.4,0,1); drawLeaf(g,stemX,cy+stemLen*0.22,-1,44*leafP,f.stemC); }
        if (progress>0.5) { const leafP=p.constrain((progress-0.5)/0.4,0,1); drawLeaf(g,stemX,cy+stemLen*0.50, 1,38*leafP,f.stemC); }
        if (progress>0.7) { const leafP=p.constrain((progress-0.7)/0.3,0,1); drawLeaf(g,stemX,cy+stemLen*0.35,-1,30*leafP,f.stemC); }
      }

      function drawPeony3D(g,f,bl,wl,cx,cy) {
        wl=wl||0;
        const focal=440, items=[];
        const cAlpha=p.constrain((bl-0.45)/0.3,0,1)*(1-wl);
        if (cAlpha>0) items.push({rz:0,tp:'c',sx:0,sy:0,sa:0,alpha:cAlpha});
        for (let layer=f.layers;layer>=0;layer--) {
          const lr=layer/f.layers, layerDelay=(1-lr)*0.35;
          const layerBl=p.constrain((bl-layerDelay)/(1-layerDelay),0,1);
          const ebl=easeInOutCubic(layerBl);
          if (ebl<0.01) continue;
          const layerFall=p.constrain((wl*1.4-(1-lr)*0.4)/0.6,0,1);
          if (layerFall>0.9) continue;
          const innerBoost=(1-lr);
          const np=f.petalsPerLayer+p.floor(layer*1.5)+p.floor(innerBoost*5);
          const baseR=p.lerp(10,f.maxRadius,lr);
          let tiltAngle=p.lerp(p.PI*0.42,p.PI*0.04,ebl)+layerFall*p.PI*0.22;
          tiltAngle-=innerBoost*0.15*ebl;
          const cosTilt=p.cos(tiltAngle),sinTilt=p.sin(tiltAngle);
          for (let i=0;i<np;i++) {
            const petalHash=((i*73+layer*137)&0xFF)/255;
            if (wl>0.1&&petalHash<(wl-0.1)*1.3) continue;
            let angle=(p.TWO_PI/np)*i+layer*0.42+p.sin(layer*2.1)*0.12;
            angle+=petalHash*0.15;
            const droopAmt=layerFall*0.5*(0.4+lr*0.6), shrink=1-layerFall*0.35;
            const dist=baseR*ebl*(0.35+lr*0.25);
            const x3=p.cos(angle)*dist*cosTilt, z3=p.sin(angle)*dist*cosTilt, y3=-sinTilt*dist+droopAmt*28;
            const [rx,ry,rz]=rot3D(x3,y3,z3);
            const ps=focal/(focal+rz), sx=rx*ps, sy=ry*ps;
            const viewAngle=p.atan2(ry,rx);
            const depthFactor=focal/(focal+p.abs(rz)), faceVis=p.max(depthFactor,0.12);
            const nx3=p.cos(angle)*cosTilt,ny3=-sinTilt,nz3=p.sin(angle)*cosTilt;
            const [,,lnz]=rot3D(nx3,ny3,nz3);
            const lightDot=p.constrain(-lnz,-1,1), lightMod=p.map(lightDot,-1,1,0.32,1.25);
            const cupFactor=(1-lr)*(1-ebl*0.5)*0.35;
            const pl=baseR*(0.2+0.8*ebl)*(1.15+innerBoost*0.3)*shrink*ps;
            let pw=baseR*(0.15+0.85*ebl)*0.55*shrink*ps*faceVis;
            pw*=(1+cupFactor);
            const rPhase=i*1.7+layer*0.9;
            const rAmt=f.ruffleAmt*ebl*(1+layerFall*2+innerBoost*0.5)*ps;
            const lA=p.sin(angle+layer*0.5), dM=p.map(layer,0,f.layers,0.35,1.0);
            const bB=0.4+0.6*ebl, cm=p.map(lA,-1,1,0.45,1.2)*dM*bB*lightMod;
            const r=p.constrain(p.lerp(f.c1[0],f.c2[0],lr)*cm,0,255);
            const gr=p.constrain(p.lerp(f.c1[1],f.c2[1],lr)*cm,0,255);
            const b=p.constrain(p.lerp(f.c1[2],f.c2[2],lr)*cm,0,255);
            items.push({rz,tp:'p',sx,sy,sa:viewAngle,pl,pw,rPhase,rAmt,r,gr,b,cup:cupFactor});
          }
        }
        items.sort((a,b)=>a.rz-b.rz);
        for (const it of items) {
          if (it.tp==='c') {
            g.push(); g.translate(cx,cy);
            const [cnx,cny,cnz]=rot3D(0,-1,0);
            const cps=focal/(focal+cnz*15), csx=cnx*15*cps, csy=cny*15*cps;
            for (let r=30;r>0;r-=3) {
              const ratio=r/30;
              g.fill(p.lerp(f.c3[0]*.1,f.c3[0]*.7,ratio)*(it.alpha||1),
                     p.lerp(f.c3[1]*.1,f.c3[1]*.7,ratio)*(it.alpha||1),
                     p.lerp(f.c3[2]*.1,f.c3[2]*.7,ratio)*(it.alpha||1));
              g.ellipse(csx,csy,r*2.2*cps,r*2.2*cps);
            }
            g.pop();
          } else {
            if (!it.pw||it.pw<0.5) continue;
            g.push(); g.translate(cx+it.sx,cy+it.sy); g.rotate(it.sa);
            g.fill(it.r,it.gr,it.b);
            
            const ctx2d = g.drawingContext;
            ctx2d.beginPath();
            ctx2d.moveTo(0, 0);
            for (let tt=0.07;tt<=1;tt+=0.07) {
              const px=tt*it.pl, bW=p.sin(tt*p.PI)*it.pw;
              const cup=p.sin(tt*p.PI)*(it.cup||0)*it.pw*0.6;
              const ruf=p.sin(tt*8+it.rPhase)*it.rAmt*tt;
              ctx2d.lineTo(px,bW+ruf+cup);
            }
            for (let tt=1;tt>=0;tt-=0.07) {
              const px=tt*it.pl, bW=p.sin(tt*p.PI)*it.pw;
              const cup=p.sin(tt*p.PI)*(it.cup||0)*it.pw*0.4;
              const ruf=p.sin(tt*8+it.rPhase+p.PI)*it.rAmt*tt;
              ctx2d.lineTo(px,-bW+ruf-cup);
            }
            ctx2d.closePath();
            ctx2d.fill();
            g.pop();
          }
        }
      }

      function drawFlowerToBuffer(f,bl,wl) {
        buf.background(0); buf.noStroke(); wl=wl||0;
        const cxCenter = BUF_W / 2;
        const cy = BUF_H * 0.50; // Vertically center the flowers in the text area

        // 5 flowers with staggered bloom timings to cover all letters (S to A)
        const flowers = [
          { cx: cxCenter,        blOffset: 0.00,  rScale: 1.15 }, // Center (N, O)
          { cx: cxCenter - 240,  blOffset: 0.06,  rScale: 1.05 }, // Inner Left (O)
          { cx: cxCenter + 240,  blOffset: 0.06,  rScale: 1.05 }, // Inner Right (R)
          { cx: cxCenter - 480,  blOffset: 0.12,  rScale: 0.95 }, // Outer Left (S)
          { cx: cxCenter + 480,  blOffset: 0.12,  rScale: 0.95 }  // Outer Right (A)
        ];

        for (const fl of flowers) {
          const blStage = p.constrain((bl - fl.blOffset) / (1 - fl.blOffset), 0, 1);
          if (blStage <= 0.001) continue;

          const stemProgress = p.constrain(blStage * 3.0, 0, 1);
          const flowerBloom  = p.constrain((blStage - 0.12) / 0.88, 0, 1);

          const fScaled = { ...f, maxRadius: f.maxRadius * fl.rScale };

          drawStem(buf, fScaled, stemProgress, wl, fl.cx, cy);
          drawPeony3D(buf, fScaled, flowerBloom, wl, fl.cx, cy);
        }

        buf.loadPixels();
      }

      function renderWithLetterMask() {
        const px     = buf.pixels;
        const g      = p.max(5, p.round(grid));
        const scaleF = p.min(p.width/BUF_W, p.height/BUF_H)*0.92;
        const invS   = 1/scaleF;
        const rW=BUF_W*scaleF, rH=BUF_H*scaleF;
        const ox=(p.width-rW)/2, oy=(p.height-rH)/2;
        const asciiG = p.max(g,6);
        const transitionDone = modeT>=0.99;
        const curM=renderMode, prevM=prevMode, mt=modeT;
        if ((curM===0)||(!transitionDone&&prevM===0)) {
          ctx.textAlign='center'; ctx.textBaseline='middle';
        }
        const gEff=(curM===0&&transitionDone)?asciiG:g;
        const halfG=gEff*0.5;
        const yStart=p.max(0,p.floor(oy/gEff)*gEff);
        const yEnd=p.min(p.height,oy+rH);
        const xStart=p.max(0,p.floor(ox/gEff)*gEff);
        const xEnd=p.min(p.width,ox+rW);
        const asciiSize=gEff*1.05;
        let lastFontStr='';

        for (let sy=yStart;sy<yEnd;sy+=gEff) {
          const byBase=p.floor((sy-oy)*invS);
          if (byBase<0||byBase>=BUF_H) continue;
          const rowOff=byBase*BUF_W;
          for (let sx=xStart;sx<xEnd;sx+=gEff) {
            const bx=p.floor((sx-ox)*invS);
            if (bx<0||bx>=BUF_W) continue;
            const idx=(rowOff+bx)*4;
            const r=px[idx],gr=px[idx+1],b=px[idx+2];
            if ((r+gr+b)<12) continue;
            const bright=r*0.299+gr*0.587+b*0.114;
            const cxp=sx+halfG, cyp=sy+halfG;
            let mode;
            if (transitionDone) { mode=curM; }
            else { const hash=((sx*73+sy*137)&0xFF)*0.00392; mode=hash<mt?curM:prevM; }
            if (mode===0) {
              const fontSz=p.floor(asciiSize*(0.38+bright*0.004));
              const fontStr=fontSz+'px Courier New';
              if (fontStr!==lastFontStr){ctx.font=fontStr;lastFontStr=fontStr;}
              ctx.fillStyle='rgb('+r+','+gr+','+b+')';
              const ci=((bright>>2)+((sx*7+sy*13)>>3))%chars.length;
              ctx.fillText(chars[ci],cxp,cyp);
            } else if (mode===1) {
              p.fill(r,gr,b);
              const d=gEff*(0.12+bright*0.0032); p.ellipse(cxp,cyp,d,d);
            } else {
              p.fill(r,gr,b); p.rectMode(p.CENTER);
              p.rect(cxp,cyp,gEff*0.90,gEff*0.90);
            }
          }
        }

        const fontSize = p.min(p.width/5.5, p.height*0.22);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold '+fontSize+'px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        try {
          ctx.letterSpacing = (fontSize * 0.10)+'px';
        } catch (e) {
          // ignore if not supported
        }
        ctx.fillText('SONORA', p.width/2, p.height/2);
        ctx.restore();
      }

      p.setup = function() {
        p.createCanvas(window.innerWidth, window.innerHeight);
        p.pixelDensity(1);
        p.textFont('Courier New, monospace');
        p.textAlign(p.CENTER, p.CENTER);
        p.noStroke();
        buf = p.createGraphics(BUF_W, BUF_H);
        buf.pixelDensity(1); buf.noSmooth();
        buf.canvas.getContext('2d',{willReadFrequently:true});
        ctx = p.drawingContext;
        startElement(0);
        bloom = 0;
      };

      p.draw = function() {
        const rawDt = p.deltaTime / 1000;

        // ── measure real FPS and set speed multiplier ──
        const instantFPS = rawDt > 0 ? (1 / rawDt) : 60;
        fpsHistory.push(instantFPS);
        if (fpsHistory.length > FPS_WINDOW) fpsHistory.shift();
        const avgFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
        speedMult = avgFPS < FPS_LOW ? SPEED_BOOST : SPEED_NORMAL;

        const dt = rawDt * speedMult; // ← all animation uses boosted dt
        const f  = elements[curEl];

        p.background(0);
        t += 0.016 * speedMult;

        rotEaseIn = p.min(1, rotEaseIn+dt*0.09);
        const re = easeInOutCubic(rotEaseIn);
        autoRotY += dt*0.28*re;
        autoRotX += dt*0.11*p.sin(t*0.14)*re;
        autoRotZ += dt*0.07*p.sin(t*0.08+1.5)*re;
        mouseRotX += (0-mouseRotX)*0.04;
        mouseRotY += (0-mouseRotY)*0.04;
        rotX=autoRotX; rotY=autoRotY; rotZ=autoRotZ;

        if (phase==='growing') {
          bloom += (bloomTarget-bloom)*0.055; // fast bloom — targets ~8s grow
          phaseT += dt;
          if (bloom>0.98) { bloom=1; phase='interactive'; phaseT=0; }
        }

        densTimer += dt;
        if (densTimer>0.85) {
          densTimer=0;
          triggerGlitch();
          prevMode=renderMode; renderMode=(renderMode+1)%3; modeT=0;
          if (densDir===1){gridTarget=GRID_MAX;densDir=-1;}
          else{gridTarget=GRID_MIN;densDir=1;}
        }

        if (phase==='interactive') {
          phaseT += dt;
          // Short hold before wilting — 2s
          if (phaseT>2.0) { phase='wilting'; phaseT=0; triggerGlitch(); }
        }

        if (phase==='wilting') {
          wilt=p.min(1,wilt+dt*0.22); // fast wilt — ~5s total
          phaseT += dt;
          if (wilt>0.95) { phase='done'; phaseT=0; }
        }

        if (phase==='done' && !finishCalled) {
          finishCalled = true;
          setTimeout(triggerFinish, 400);
        }

        grid += (gridTarget-grid)*0.08;
        modeT = p.min(1,modeT+dt*4.0);
        updateGlitch(dt);

        drawFlowerToBuffer(f,bloom,wilt);
        renderWithLetterMask();
        drawGlitchOverlay();
      };

      p.windowResized = function() {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };
    };

    if (wrapRef.current) {
      introP5 = new p5(introSketch, wrapRef.current);
      introP5Ref.current = introP5;
    }

    return () => {
      if (introP5) {
        introP5.remove();
        introP5 = null;
      }
    };
  }, [onComplete]);

  const handleOverlayClick = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    // Freeze the animation canvas so it pauses cleanly during the fade
    if (introP5Ref.current) {
      try { introP5Ref.current.noLoop(); } catch(e) {}
    }

    // Signal login panel to start sliding in
    if (onTransitionStart) onTransitionStart();

    // Trigger a faster (600ms) smooth fade on skip
    setSkipFade(true);
    setFading(true);

    setTimeout(() => {
      if (introP5Ref.current) {
        try { introP5Ref.current.remove(); } catch(e) {}
        introP5Ref.current = null;
      }
      onComplete();
    }, 650);
  };

  return (
    <div
      id="cube-intro-overlay"
      className={fading ? "fade-out" : ""}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#000",
        zIndex: 9999,
        pointerEvents: fading ? "none" : "all",
        transition: skipFade
          ? "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "opacity 1100ms cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: fading ? 0 : 1,
      }}
    >
      <div
        id="intro-canvas-wrap"
        ref={wrapRef}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      />
      <style>{`
        #intro-canvas-wrap canvas {
          display: block;
        }
      `}</style>
    </div>
  );
}

/* Ordela global viewport/orientation manager.
 * CSS uses dynamic viewport units; this script only requests a stable reflow.
 * It deliberately never translates the app shell or uses visualViewport.offsetTop
 * as a layout coordinate, preventing stale iOS hit-testing after rotation.
 */
(function(){
  'use strict';
  var timers=[],raf=0;
  function measure(){
    var root=document.documentElement;
    var width=root.clientWidth||window.innerWidth;
    var height=root.clientHeight||window.innerHeight;
    if(!width||!height)return;
    root.style.setProperty('--ordela-vw',width+'px');
    root.style.setProperty('--ordela-vh',height+'px');
    void root.getBoundingClientRect();
    var fixed=root.querySelectorAll('[data-rotation-layout],.bnav,.drawer,.scrim,.sheet,.modal,#invoice');
    for(var i=0;i<fixed.length;i++){
      if(fixed[i].isConnected)void fixed[i].getBoundingClientRect();
    }
    window.dispatchEvent(new CustomEvent('ordela:viewportchange',{
      detail:{width:width,height:height,orientation:width>height?'landscape':'portrait'}
    }));
  }
  function schedule(){
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(function(){raf=0;measure()});
  }
  function rotate(){
    for(var i=0;i<timers.length;i++)clearTimeout(timers[i]);
    timers=[];
    document.documentElement.classList.add('ordela-rotating');
    schedule();
    [120,280,520,800].forEach(function(ms){timers.push(setTimeout(schedule,ms))});
    timers.push(setTimeout(function(){
      document.documentElement.classList.remove('ordela-rotating');
      schedule();
    },900));
  }
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',rotate,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule()});
  if(window.screen&&screen.orientation&&screen.orientation.addEventListener){
    screen.orientation.addEventListener('change',rotate);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',measure,{once:true});
  }else measure();
})();
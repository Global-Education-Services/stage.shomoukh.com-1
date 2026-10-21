/** Keyboard focus ownership for the website's existing modal overlays. */
const stack=[];
const focusable=dialog=>[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(element=>!element.disabled&&!element.closest('[inert]')&&element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
export function focusDialog(dialog,preferred){
 if(!dialog||stack.some(item=>item.dialog===dialog))return;
 stack.push({dialog,previous:document.activeElement});
 dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 const moveFocus=()=>{if(stack.at(-1)?.dialog===dialog)(preferred||focusable(dialog)[0]||dialog).focus({preventScroll:true});};
 moveFocus();
 // Visibility transitions can keep descendants unfocusable until the next paint.
 getComputedStyle(dialog).visibility;
 requestAnimationFrame(moveFocus);
 Promise.all(dialog.getAnimations().map(animation=>animation.finished.catch(()=>{}))).then(moveFocus);
}
export function releaseDialog(dialog){
 const index=stack.findIndex(item=>item.dialog===dialog);if(index<0)return;
 const [item]=stack.splice(index,1);if(item.previous?.isConnected)item.previous.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{
 if(event.key!=='Tab'||!stack.length)return;
 const {dialog}=stack.at(-1),elements=focusable(dialog),first=elements[0],last=elements.at(-1);
 if(!first){event.preventDefault();dialog.focus();return;}
 if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
});

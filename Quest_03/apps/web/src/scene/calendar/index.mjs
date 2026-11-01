// CSS perspective preserves the same accessible DOM and event IDs in both views.
export function setSpatial(on) {
  document.querySelector('#events').classList.toggle('spatial',on);
  document.querySelector('#flat-view').setAttribute('aria-pressed',String(!on));
  document.querySelector('#space-view').setAttribute('aria-pressed',String(on));
}

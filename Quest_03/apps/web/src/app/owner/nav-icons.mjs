const paths={
 overview:['#7c3aed','#ede9fe','<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="14" y="4" width="6" height="4" rx="1.5"/><rect x="14" y="11" width="6" height="9" rx="2"/><rect x="4" y="14" width="7" height="6" rx="2"/>'],
 calendar:['#2563eb','#dbeafe','<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v5M16 3v5" fill="none" stroke="#fff" stroke-width="2"/><rect x="7" y="13" width="4" height="4" rx="1" fill="#fff"/>'],
 tasks:['#059669','#d1fae5','<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 3 3 5-6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'],
 projects:['#ea580c','#ffedd5','<path d="M3 7a3 3 0 0 1 3-3h4l3 3h5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M6 12h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
 settings:['#db2777','#fce7f3','<path d="m10 2 4 0 1 3 3 1 3 3-2 3 2 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 2-3-2-3 3-3 3-1z"/><circle cx="12" cy="12" r="4" fill="#fff"/>']
};
export function navIcon(id){const [color,background,path]=paths[id];return `<span class="nav-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><rect width="26" height="26" rx="7" fill="${background}"/><g transform="translate(2 2) scale(.92)" fill="${color}">${path}</g></svg></span>`;}

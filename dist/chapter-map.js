// Pure helpers shared by the map and the chapter geography checks.
export function chapterFocus(data, chapter) {
  return data.chapterMaps?.find(item => item.chapter === Number(chapter));
}

export function chapterRoutes(data, chapter, scope = 'overview') {
  const focus = chapterFocus(data, chapter);
  const refs = [...(focus?.routes || []), ...(scope === 'overview' ? (focus?.contextRoutes || []).map(ref=>({...ref,contextRoute:true})) : [])];
  return refs.map(ref => {
    const route = [...data.campaigns, ...(data.textRoutes || [])].find(item => item.id === ref.id);
    if (!route) return null;
    // A reference to this book gives the path its chapter and verse.
    const passage = ref.reference?.startsWith(`${data.book?.name} `) ? ref.reference.slice(data.book.name.length).match(/^ (\d+):(\d+)/) : null;
    return { ...route, id: `${chapter}:${route.id}:${ref.from}:${ref.to}`, originalId: route.id,
      chapter: passage ? Number(passage[1]) : route.chapter,
      verse: passage ? Number(passage[2]) : route.verse,
      kind:ref.kind || route.kind || (route.faction === 'babylonia' ? 'diplomacy' : 'military'),
      evidence:ref.evidence || route.evidence || 'Historical campaign context', contextRoute:!!ref.contextRoute,
      title: ref.title || route.title, points: route.points.slice(ref.from, ref.to + 1),
      reference: ref.reference, chapterRoute: true };
  }).filter(Boolean);
}

export function chapterPoints(data, chapter, scope = 'overview') {
  const focus = chapterFocus(data, chapter);
  const ids = scope === 'overview' ? [...(focus?.focusPlaceIds || []),...(focus?.contextPlaceIds || []),...(focus?.impacts || []).map(i=>i.placeId)] : focus?.focusPlaceIds || [];
  const places = ids.map(id => data.places.find(p => p.id === id)).filter(Boolean);
  // Detail keeps local narrative paths when no earlier chapter path exists (e.g. Moab).
  const routes = chapterRoutes(data, chapter, scope === 'detail' && !focus?.routes?.length ? 'overview' : scope);
  return [...places.map(p => [p.lat, p.lng]), ...routes.flatMap(r => r.points)];
}

export const movementStyles = {
  journey:{label:'Journey',color:'#128879',dash:'8 5'},
  military:{label:'Army path',color:'#c43c32',dash:'9 5'},
  flight:{label:'Escape path',color:'#db8410',dash:'3 6'},
  exile:{label:'Path into exile',color:'#904fac',dash:'10 4 2 4'},
  restoration:{label:'Path home',color:'#128879',dash:'8 5'},
  diplomacy:{label:'Message or gift',color:'#257fbd',dash:'12 5'}
};
export function movementStyle(route) { return movementStyles[route.kind] || movementStyles.diplomacy; }

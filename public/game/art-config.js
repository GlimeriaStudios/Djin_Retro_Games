// Appearance only. Metres match the existing meshes; strengths are unitless.
// Visual stages are tracked in Git; the coastal look is always active.
export const ART = {
 lighting: {
  sun: '#FFD3A0', intensity: 2.15, elevation: 15, distance: 160,
  sky: '#FFB070', ground: '#4A3A6A', ambient: 2.05,
  background: '#d8a29d', fogNear: 150, fogFar: 440, exposure: 1.0,
  // Shadow volume covers the existing race camera's complete range, in metres.
  shadows:true, shadowExtent: 190, shadowFar: 420, shadowBias: -.0008, shadowNormalBias: .12,
 },
 palette: {
  road: '#4A4650', gravel: '#bca27e', kerbRed: '#B83A3A', kerbCream: '#D8D0C4',
  wall: '#D9B9AE', roof: '#bb806d', steel: '#737780', rust: '#8A4A2A', rustLight: '#B0602E',
  mud: '#514234', dust: '#c5b59e', bareMetal: '#9a9b98',
  sand: '#E8C496', rock: '#B08A6A', rockShade: '#79617b',
  foliage: '#3F8A4A', leafLight: '#7CC45A', trunk: '#8A6A52',
  shallow: '#3FB0C0', deep: '#2A5A90', foam: '#edf2df',
 },
 material: { roughness: .82, metalness: .06, glassRoughness: .22, foliageRoughness:.6, oilRoughness:.12, diffuseFill: .58, smoothRoadNormals:true },
 // Keys are original material colours, so overrides do not rename model systems.
 surfaceOverrides: {
  '3a4a52':{roughness:.22,grunge:.10}, // Vehicle glass: retain a little dust and gloss.
  '83a6b7':{roughness:.28,grunge:.12}, // Existing resort windows.
  '151a1d':{roughness:.9,grunge:.20}, // Rubber stays matte.
 },
 rim: { color: '#FFC27A', vehicle: .34, nature: .16, building: .035, power: 2.4 },
 grunge: {
  enabled: true, vehicle: .42, building: .68, road: .6,
  scale: .8, rustThreshold: .71, rustStrength: .42, dust: .15, mud: .28,
  roofProtection: .82, edgeWear: .18, roadTileMetres: 20,
  textureSize: 256, seed: 71493, cracks: 12, stains: 8,
  crackWidth: .65, stainOpacity: .32, scratchDensity: 500,
  mudHeight: 1.15, dustThreshold: .65,
  wallStreaks:.22, streakWidth:.24, streakHeight:.025,
 },
 signage: { paper:'#d1b391', ink:'#475966', accent:'#b86550', border:18, stripes:5 },
 nature: { enabled: true, gradient: .28, waterScale: .045, waveSpeed: .28,
  glint: .28, foamStrength: .3, foamWidth: 1.8, shoreRadius: 18,
  shoreTextureSize: 512, worldSize: 650, leafWrap: .18, waterShadow:.42,
  islands: [[-102,-60],[115,45],[100,-78],[-100,70]], islandRadius: 10,
  palms: true, palmHeight: 9, trunkRadius: .35, leafLength: 3.5,
  leafWidth: .9, leafThickness: .27, leaves: 7, baseY: -1.75,
  palmOffsets: [[8,3],[-8,-3]], crownDrop: .27,
 },
 fx: { core: '#FFB040', fire: '#FF6A1A', smoke: '#3A3438', trail: '#D8D2CC',
  spark: '#FFD27A', mine: '#FF2A3A', oil: '#0E0C14', sheen: '#70608b', pickup: '#6AE0F0' },
 // Speed thresholds in m/s (~65–126 km/h); edge-only lines never move the camera.
 speedVfx:{startSpeed:18,fullSpeed:35,boost:.25,strength:.18,response:.18,color:'#c6e4dc',rays:42},
 vehicleDetail:{chrome:'#aaa99f',rubber:'#22242a',glass:'#3a4a52',lamps:'#fff0c9',tail:'#b83a3a',wood:'#79614b',stripe:'#292b36'},
 post: { enabled: true, bloom: .1, threshold: 1.15, emissiveGain:2.5, blur: .3,
  focusPadding: .14, contrast: 1.055, saturation: .97,
  warm: .018, shadowTint: .022, grain: .006, grainFps: 24, vignette: .12,
  bloomRadius:3, blurRadius:1.4, samples:4 },
};

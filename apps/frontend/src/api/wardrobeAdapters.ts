import {WardrobeItem} from '../../types/wardrobe';

export function toCreateDto(x: WardrobeItem) {
  return {
    user_id: x.userId,
    image_url: x.image,
    gsutil_uri: x.gsutilUri,
    object_key: x.objectKey,
    name: x.name,

    ai_title: x.aiTitle,
    ai_description: x.aiDescription,
    ai_key_attributes: x.aiKeyAttributes,
    ai_confidence: x.aiConfidence,

    main_category: x.mainCategory,
    subcategory: x.subCategory,
    tags: x.tags,
    style_descriptors: x.styleDescriptors,
    style_archetypes: x.styleArchetypes,
    anchor_role: x.anchorRole,

    occasion_tags: x.occasionTags,
    dress_code: x.dressCode,
    formality_score: x.formalityScore,

    color: x.color,
    dominant_hex: x.dominantHex,
    palette_hex: x.paletteHex,
    color_family: x.colorFamily,
    color_temp: x.colorTemp,
    contrast_profile: x.contrastProfile,

    material: x.material,
    fabric_blend: x.fabricBlend,
    fit: x.fit,
    stretch_pct: x.stretchPct,
    thickness: x.thickness,
    thermal_rating: x.thermalRating,
    breathability: x.breathability,
    fabric_weight_gsm: x.fabricWeightGsm,
    wrinkle_resistance: x.wrinkleResistance,
    stretch_direction: x.stretchDirection,

    pattern: x.pattern,
    pattern_scale: x.patternScale,

    neckline: x.neckline,
    collar_type: x.collarType,
    sleeve_length: x.sleeveLength,
    hem_style: x.hemStyle,
    rise: x.rise,
    leg: x.leg,
    inseam_in: x.inseamIn,
    cuff: x.cuff,
    lapel: x.lapel,
    closure: x.closure,
    length_class: x.lengthClass,
    shoe_style: x.shoeStyle,
    sole: x.sole,
    toe_shape: x.toeShape,

    seasonality: x.seasonality,
    seasonality_arr: x.seasonalityArr,
    layering: x.layering,

    rain_ok: x.rainOk,
    wind_ok: x.windOk,
    waterproof_rating: x.waterproofRating,
    climate_sweetspot_f_min: x.climateSweetspotFMin,
    climate_sweetspot_f_max: x.climateSweetspotFMax,

    size: x.size,
    size_label: x.sizeLabel,
    size_system: x.sizeSystem,
    measurements: x.measurements,
    width: x.width,
    height: x.height,

    care_symbols: x.careSymbols,
    wash_temp_c: x.washTempC,
    dry_clean: x.dryClean,
    iron_ok: x.ironOk,

    wear_count: x.wearCount,
    last_worn_at: x.lastWornAt,
    rotation_priority: x.rotationPriority,

    brand: x.brand,
    retailer: x.retailer,
    purchase_date: x.purchaseDate,
    purchase_price: x.purchasePrice,
    country_of_origin: x.countryOfOrigin,
    condition: x.condition,
    defects_notes: x.defectsNotes,

    goes_with_ids: x.goesWithIds,
    avoid_with_ids: x.avoidWithIds,

    user_rating: x.userRating,
    fit_confidence: x.fitConfidence,
    outfit_feedback: x.outfitFeedback?.map(o => ({
      outfit_id: o.outfitId,
      liked: o.liked,
      reason_codes: o.reasonCodes,
    })),
    disliked_features: x.dislikedFeatures,

    metadata: x.metadata,
    constraints: x.constraints, // string
  };
}

export function fromApi(row: any): WardrobeItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    image: row.image_url,
    gsutilUri: row.gsutil_uri ?? undefined,
    objectKey: row.object_key ?? undefined,

    aiTitle: row.ai_title ?? undefined,
    aiDescription: row.ai_description ?? undefined,
    aiKeyAttributes: row.ai_key_attributes ?? undefined,
    aiConfidence: row.ai_confidence ?? undefined,

    mainCategory: row.main_category,
    subCategory: row.subcategory ?? undefined,
    tags: row.tags ?? undefined,
    styleDescriptors: row.style_descriptors ?? undefined,
    styleArchetypes: row.style_archetypes ?? undefined,
    anchorRole: row.anchor_role ?? undefined,

    occasionTags: row.occasion_tags ?? undefined,
    dressCode: row.dress_code ?? undefined,
    formalityScore: row.formality_score ?? undefined,

    color: row.color ?? undefined,
    dominantHex: row.dominant_hex ?? undefined,
    paletteHex: row.palette_hex ?? undefined,
    colorFamily: row.color_family ?? undefined,
    colorTemp: row.color_temp ?? undefined,
    contrastProfile: row.contrast_profile ?? undefined,

    material: row.material ?? undefined,
    fabricBlend: row.fabric_blend ?? undefined,
    fit: row.fit ?? undefined,
    stretchPct: row.stretch_pct ?? undefined,
    thickness: row.thickness ?? undefined,
    thermalRating: row.thermal_rating ?? undefined,
    breathability: row.breathability ?? undefined,
    fabricWeightGsm: row.fabric_weight_gsm ?? undefined,
    wrinkleResistance: row.wrinkle_resistance ?? undefined,
    stretchDirection: row.stretch_direction ?? undefined,

    pattern: row.pattern ?? undefined,
    patternScale: row.pattern_scale ?? undefined,

    neckline: row.neckline ?? undefined,
    collarType: row.collar_type ?? undefined,
    sleeveLength: row.sleeve_length ?? undefined,
    hemStyle: row.hem_style ?? undefined,
    rise: row.rise ?? undefined,
    leg: row.leg ?? undefined,
    inseamIn: row.inseam_in ?? undefined,
    cuff: row.cuff ?? undefined,
    lapel: row.lapel ?? undefined,
    closure: row.closure ?? undefined,
    lengthClass: row.length_class ?? undefined,
    shoeStyle: row.shoe_style ?? undefined,
    sole: row.sole ?? undefined,
    toeShape: row.toe_shape ?? undefined,

    seasonality: row.seasonality ?? undefined,
    seasonalityArr: row.seasonality_arr ?? undefined,
    layering: row.layering ?? undefined,

    rainOk: row.rain_ok ?? undefined,
    windOk: row.wind_ok ?? undefined,
    waterproofRating: row.waterproof_rating ?? undefined,
    climateSweetspotFMin: row.climate_sweetspot_f_min ?? undefined,
    climateSweetspotFMax: row.climate_sweetspot_f_max ?? undefined,

    size: row.size ?? undefined,
    sizeLabel: row.size_label ?? undefined,
    sizeSystem: row.size_system ?? undefined,
    measurements: row.measurements ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,

    careSymbols: row.care_symbols ?? undefined,
    washTempC: row.wash_temp_c ?? undefined,
    dryClean: row.dry_clean ?? undefined,
    ironOk: row.iron_ok ?? undefined,

    wearCount: row.wear_count ?? undefined,
    lastWornAt: row.last_worn_at ?? undefined,
    rotationPriority: row.rotation_priority ?? undefined,

    brand: row.brand ?? undefined,
    retailer: row.retailer ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    purchasePrice: row.purchase_price ?? undefined,
    countryOfOrigin: row.country_of_origin ?? undefined,
    condition: row.condition ?? undefined,
    defectsNotes: row.defects_notes ?? undefined,

    goesWithIds: row.goes_with_ids ?? undefined,
    avoidWithIds: row.avoid_with_ids ?? undefined,

    userRating: row.user_rating ?? undefined,
    fitConfidence: row.fit_confidence ?? undefined,
    outfitFeedback: Array.isArray(row.outfit_feedback)
      ? row.outfit_feedback.map((o: any) => ({
          outfitId: o.outfit_id,
          liked: o.liked,
          reasonCodes: o.reason_codes,
        }))
      : undefined,
    dislikedFeatures: row.disliked_features ?? undefined,

    metadata: row.metadata ?? undefined,
    constraints: row.constraints ?? undefined,

    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    deletedAt: row.deleted_at ?? null,
  };
}

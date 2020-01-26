// =-=-=-=-=-=-=-=-=-=-=-=-=-=-
// SIMPLE PARTS OF LARGER TYPES
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-

/**
 * @typedef GraphEdgeCount
 * @property {number} count
 */

/**
 * @typedef GraphEdgesText
 * @type {{edges: {node: {text: string}}[]}}
 */

/**
 * @typedef Edges<T>
 * @property {{node: T}[]} edges
 * @template T
 */

/**
 * @typedef PagedEdges<T>
 * @property {number} count
 * @property {{has_next_page: boolean, end_cursor: string}} page_info
 * @property {{node: T}[]} edges
 * @template T
 */

/**
 * @typedef Dimensions
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef DisplayResource
 * @property {string} src
 * @property {number} config_width
 * @property {number} config_height
 */

/**
 * @typedef BasicOwner
 * @property {string} id
 * @property {string} username
 */

/**
 * @typedef ExtendedOwner
 * @property {string} id
 * @property {boolean} is_verified
 * @property {string} profile_pic_url
 * @property {string} username
 * @property {string} full_name
 */

// =-=-=-=-=-=-=-
// TIMELINE ENTRY
// =-=-=-=-=-=-=-

/*
	Kinds:
	N1   Provided in _sharedData from user page load
	N2   Provided in later user page loads
	N3   Provided in direct graph query
	N4   Provided in _sharedData from shortcode page load (just a sorted N3)
*/

/**
 * @typedef TimelineEntryAll
 * N1
 * @property {string} __typename
 * @property {string} id
 * @property {GraphEdgesText} edge_media_to_caption
 * @property {string} shortcode
 * @property {GraphEdgeCount} edge_media_to_comment
 * @property {boolean} comments_disabled
 * @property {number} taken_at_timestamp
 * @property {Dimensions} dimensions
 * @property {string} display_url
 * @property {GraphEdgeCount} edge_liked_by
 * @property {GraphEdgeCount} edge_media_preview_like same as edge_liked_by?
 * @property {any} location todo: doc
 * @property {any} gating_info todo: discover
 * @property {any} fact_check_overall_rating todo: discover
 * @property {any} fact_check_information todo: discover
 * @property {string} media_preview base64 of something
 * @property {BasicOwner & ExtendedOwner} owner
 * @property {string} thumbnail_src
 * @property {DisplayResource[]} [thumbnail_resources]
 * @property {boolean} is_video
 * N2
 * @property {DisplayResource[]} [display_resources]
 * @property {string} [tracking_token]
 * @property {any} [edge_media_to_tagged_user] todo: doc
 * @property {any} [edge_media_to_sponsor_user] todo: discover
 * @property {boolean} [viewer_has_liked]
 * @property {boolean} [viewer_has_saved]
 * @property {boolean} [viewer_has_saved_to_collection]
 * @property {boolean} [viewer_in_photo_of_you]
 * @property {boolean} [viewer_can_reshare]
 * N3
 * @property {boolean} [caption_is_edited]
 * @property {boolean} [has_ranked_comments]
 * @property {boolean} [comments_disabled]
 * @property {boolean} [commenting_disabled_for_viewer]
 * @property {number} [taken_at_timestamp]
 * @property {boolean} [is_ad]
 * @property {any} [edge_web_media_to_related_media] todo: discover
 * Image
 * @property {string | null} [accessibility_caption]
 * Video
 * @property {any} [felix_profile_grid_crop] todo: discover
 * @property {number} [video_view_count]
 * @property {any} [dash_info] todo: discover
 * @property {string} [video_url]
 * @property {any} [encoding_status] todo: discover
 * @property {boolean} [is_published]
 * @property {string} [product_type] todo: discover
 * @property {string} [title] todo: discover
 * @property {number} [video_duration]
 * Sidecar
 * @property {Edges<GraphChildN3>} [edge_sidecar_to_children]
 */

/**
 * @typedef GraphChildAll
 * properties marked X will always be available on actual children, but are optional here for typing ease because TimelineEntryAll can be assigned directly
 * N2
 * @property {string} __typename
 * @property {string} id
 * @property {Dimensions} dimensions
 * @property {string} display_url
 * @property {DisplayResource[]} [display_resources] X
 * @property {boolean} is_video
 * @property {string} [tracking_token] X
 * @property {any} [edge_media_to_tagged_user] X todo: doc
 * N3
 * @property {string} [shortcode]
 * @property {any} [gating_info] todo: discover
 * @property {any} [fact_check_overall_rating] todo: discover
 * @property {any} [fact_check_information] todo: discover
 * @property {string} [media_preview] base64 of something
 * Image
 * @property {string | null} [accessibility_caption]
 * Video
 * @property {any} [dash_info] todo: discover
 * @property {string} [video_url]
 * @property {number} [video_view_count]
 */

/**
 * @typedef TimelineEntryN1
 * @property {string} __typename
 * @property {string} id
 * @property {GraphEdgesText} edge_media_to_caption
 * @property {string} shortcode
 * @property {GraphEdgeCount} edge_media_to_comment
 * @property {boolean} comments_disabled
 * @property {number} taken_at_timestamp
 * @property {Dimensions} dimensions
 * @property {string} display_url
 * @property {GraphEdgeCount} edge_liked_by
 * @property {GraphEdgeCount} edge_media_preview_like same as edge_liked_by?
 * @property {any} location todo: doc
 * @property {any} gating_info todo: discover
 * @property {any} fact_check_overall_rating todo: discover
 * @property {any} fact_check_information todo: discover
 * @property {string} media_preview base64 of something
 * @property {BasicOwner} owner
 * @property {string} thumbnail_src
 * @property {DisplayResource[]} thumbnail_resources
 * @property {boolean} is_video
 */

/**
 * @typedef {TimelineEntryN1 & GraphImageN1Diff} GraphImageN1
 *
 * @typedef GraphImageN1Diff
 * @property {"GraphImage"} __typename
 * @property {string} accessibility_caption
 */

/**
 * @typedef {TimelineEntryN1 & GraphVideoN1Diff} GraphVideoN1
 *
 * @typedef GraphVideoN1Diff
 * @property {"GraphVideo"} __typename
 * @property {any} felix_profile_grid_crop todo: discover
 * @property {number} video_view_count
 */

/**
 * @typedef {TimelineEntryN1 & GraphSidecarN1Diff} GraphSidecarN1
 *
 * @typedef GraphSidecarN1Diff
 * @property {"GraphSidecar"} __typename
 */

/**
 * @typedef TimelineEntryN2
 * @property {string} __typename
 * @property {string} id
 * @property {Dimensions} dimensions
 * @property {string} display_url
 * @property {DisplayResource[]} display_resources
 * @property {boolean} is_video
 * @property {string} tracking_token
 * @property {any} edge_media_to_tagged_user todo: doc
 * @property {GraphEdgesText} edge_media_to_caption
 * @property {string} shortcode
 * @property {any} edge_media_to_comment todo: doc
 * @property {any} edge_media_to_sponsor_user todo: discover
 * @property {boolean} comments_disabled
 * @property {number} taken_at_timestamp
 * @property {GraphEdgeCount} edge_media_preview_like
 * @property {any} gating_info todo: discover
 * @property {any} fact_check_overall_rating todo: discover
 * @property {any} fact_check_information
 * @property {string} media_preview base64 of something
 * @property {BasicOwner} owner
 * @property {any} location todo: doc
 * @property {boolean} viewer_has_liked
 * @property {boolean} viewer_has_saved
 * @property {boolean} viewer_has_saved_to_collection
 * @property {boolean} viewer_in_photo_of_you
 * @property {boolean} viewer_can_reshare
 * @property {string} thumbnail_src
 * @property {DisplayResource[]} thumbnail_resources
 */

/**
 * @typedef {TimelineEntryN2 & GraphImageN2Diff} GraphImageN2
 *
 * @typedef GraphImageN2Diff
 * @property {"GraphImage"} __typename
 * @property {null} accessibility_caption
 */

/**
 * @typedef {TimelineEntryN2 & GraphVideoN2Diff} GraphVideoN2
 *
 * @typedef GraphVideoN2Diff
 * @property {"GraphVideo"} __typename
 * @property {any} dash_info todo: discover
 * @property {string} video_url
 * @property {number} video_view_count
 */

/**
 * @typedef {TimelineEntryN2 & GraphSidecarN2Diff} GraphSidecarN2
 *
 * @typedef GraphSidecarN2Diff
 * @property {"GraphSidecar"} __typename
 * @property {Edges<GraphChildN2>} edge_sidecar_to_children
 * @property {null} accessibility_caption
 */

/**
 * @typedef GraphChildN2
 * @property {string} __typename
 * @property {string} id
 * @property {Dimensions} dimensions
 * @property {string} display_url
 * @property {DisplayResource[]} display_resources
 * @property {boolean} is_video
 * @property {string} tracking_token
 * @property {any} edge_media_to_tagged_user todo: doc
 */

/**
 * @typedef {GraphChildN2 & GraphChildImageN2Diff} GraphChildImageN2
 *
 * @typedef GraphChildImageN2Diff
 * @property {"GraphImage"} __typename
 * @property {null} accessibility_caption
 */

/**
 * @typedef {GraphChildN2 & GraphChildVideoN2Diff} GraphChildVideoN2
 *
 * @typedef GraphChildVideoN2Diff
 * @property {"GraphVideo"} __typename
 * @property {any} dash_info todo: discover
 * @property {string} video_url
 * @property {number} video_view_count
 */

/**
 * @typedef TimelineEntryN3
 * @property {string} __typename
 * @property {string} id
 * @property {string} shortcode
 * @property {Dimensions} dimensions
 * @property {any} gating_info todo: discover
 * @property {any} fact_check_overall_rating todo: discover
 * @property {any} fact_check_information todo: discover
 * @property {string} media_preview base64 of something
 * @property {string} display_url
 * @property {DisplayResource[]} display_resources
 * @property {boolean} is_video
 * @property {string} tracking_token
 * @property {any} edge_media_to_tagged_user todo: doc
 * @property {GraphEdgesText} edge_media_to_caption
 * @property {boolean} caption_is_edited
 * @property {boolean} has_ranked_comments
 * @property {GraphEdgeCount} edge_media_to_comment
 * @property {boolean} comments_disabled
 * @property {boolean} commenting_disabled_for_viewer
 * @property {number} taken_at_timestamp
 * @property {GraphEdgeCount} edge_media_preview_like
 * @property {any} edge_media_to_sponsor_user todo: discover
 * @property {any} location todo: doc
 * @property {boolean} viewer_has_liked
 * @property {boolean} viewer_has_saved
 * @property {boolean} viewer_has_saved_to_collection
 * @property {boolean} viewer_in_photo_of_you
 * @property {boolean} viewer_can_reshare
 * @property {ExtendedOwner} owner
 * @property {boolean} is_ad
 * @property {any} edge_web_media_to_related_media todo: discover
 */

/**
 * @typedef {TimelineEntryN3 & GraphImageN3Diff} GraphImageN3
 *
 * @typedef GraphImageN3Diff
 * @property {"GraphImage"} __typename
 * @property {string} accessibility_caption
 */

/**
 * @typedef {TimelineEntryN3 & GraphVideoN3Diff} GraphVideoN3
 *
 * @typedef GraphVideoN3Diff
 * @property {"GraphVideo"} __typename
 * @property {any} dash_info todo: discover
 * @property {string} video_url
 * @property {number} video_view_count
 * @property {any} encoding_status todo: discover
 * @property {boolean} is_published
 * @property {string} product_type todo: discover
 * @property {string} title todo: discover
 * @property {number} video_duration
 * @property {string} thumbnail_src
 */

/**
 * @typedef {TimelineEntryN3 & GraphSidecarN3Diff} GraphSidecarN3
 *
 * @typedef GraphSidecarN3Diff
 * @property {"GraphSidecar"} __typename
 * @property {Edges<GraphChildN3>} edge_sidecar_to_children
 */

/**
 * @typedef GraphChildN3
 * @property {string} __typename
 * @property {string} id
 * @property {string} shortcode
 * @property {Dimensions} dimensions
 * @property {any} gating_info todo: discover
 * @property {any} fact_check_overall_rating todo: discover
 * @property {any} fact_check_information todo: discover
 * @property {string} media_preview base64 of something
 * @property {string} display_url
 * @property {DisplayResource[]} display_resources
 * @property {boolean} is_video
 * @property {string} tracking_token
 * @property {any} edge_media_to_tagged_user todo: doc
 */

/**
 * @typedef {GraphChildN3 & GraphChildImageN3Diff} GraphChildImageN3
 * @typedef GraphChildImageN3Diff
 * @property {"GraphImage"} __typename
 * @property {string} accessibility_caption
 */

/**
 * @typedef {GraphChildN3 & GraphChildVideoN3Diff} GraphChildVideoN3
 *
 * @typedef GraphChildVideoN3Diff
 * @property {"GraphVideo"} __typename
 * @property {any} dash_info todo: discover
 * @property {string} video_url
 * @property {number} video_view_count
 */

/**
 * @typedef GraphUser
 * @property {string} biography
 * @property {string} external_url
 * @property {GraphEdgeCount} edge_followed_by
 * @property {GraphEdgeCount} edge_follow
 * @property {string} full_name
 * @property {string} id
 * @property {boolean} is_business_account
 * @property {boolean} is_joined_recently
 * @property {boolean} is_verified
 * @property {string} profile_pic_url
 * @property {string} profile_pic_url_hd
 * @property {string} username
 *
 * @property {any} edge_felix_video_timeline
 * @property {PagedEdges<GraphImage>} edge_owner_to_timeline_media
 * @property {any} edge_saved_media
 * @property {any} edge_media_collections
 */

module.exports = {}

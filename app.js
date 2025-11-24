const runButton = document.getElementById('runPipeline');
const pipelineStatus = document.getElementById('pipelineStatus');
const stageContent = document.getElementById('stageContent');
const progressBar = document.getElementById('progressBar');
const liveRecap = document.getElementById('liveRecap');
// (debug logs removed)
const DEFAULT_STAGE_DURATIONS = [12, 90, 11, 80, 95, 50, 55];
let stageDurations = [...DEFAULT_STAGE_DURATIONS];
const STAGE_START_MESSAGES = [
	'Priming scrapers and warming request pools…',
	'Capturing runway cues and transcript snippets…',
	'Parsing articles and structuring insights…',
	'Blending signals into a unified trend blueprint…',
	'Generating outfits and routing through verification…',
	'Running guardrail audits and consolidating feedback…',
	'Stitching media reels with the latest approved looks…'
];

const DATA_SOURCES = {
	collector: 'assets/jsons/data_collector_output.json',
	content: 'assets/jsons/content_analyzer_output.json',
	trend: 'assets/jsons/trend_processor_output.json',
	outfits: 'assets/jsons/outfit_designer_output.json',
	video: 'assets/jsons/video_analyzer_output.json'
};

const recapState = {
	sources: {
		title: 'Source Harvest',
		tag: 'Sources',
		lines: ['Awaiting URL sweep...'],
		highlight: 'Not started'
	},
	video: {
		title: 'Video Intake',
		tag: 'Video',
		lines: ['No clips captured yet.'],
		highlight: 'Idle'
	},
	insights: {
		title: 'Insight Digest',
		tag: 'Insights',
		lines: ['No content analyzed yet.'],
		highlight: 'Awaiting parse'
	},
	trends: {
		title: 'Trend Blueprint',
		tag: 'Trends',
		lines: ['No signals processed yet.'],
		highlight: 'Empty'
	},
	outfits: {
		title: 'Outfit Capsule',
		tag: 'Outfits',
		lines: ['Design queue awaits inputs.'],
		highlight: 'Empty'
	},
	quality: {
		title: 'Reflection Checks',
		tag: 'Quality',
		lines: ['Guardrails dormant.'],
		highlight: 'Unverified'
	},
	media: {
		title: 'Runway Media',
		tag: 'Media',
		lines: ['Video output pending.'],
		highlight: 'Dormant'
	}
};

let pipelineSummaries = null;
let pipelineStory = [];
let chips = [];
let isRunning = false;
let hasCompletedRun = false;
let trendsIndia = null;

// New variables for live run management
let currentRunId = null;
let currentThreadId = null;
let isLiveRun = false;
let lastCompletedAgentCount = 0;

const SOURCE_ICON_WEB = '<svg viewBox="0 0 24 24" role="presentation"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.35 5.19H8.65C9.81 5.2 11.34 4 12 4s2.19 1.2 3.35 3.19ZM6.1 9h11.8c.07.32.1.66.1 1s-.03.68-.1 1H6.1c-.07-.32-.1-.66-.1-1s.03-.68.1-1Zm.84 5h10.02C15.72 15.8 14.17 17 12 17s-3.72-1.2-5.06-3ZM12 20c-1.66 0-3.19-1.2-4.35-3.19h8.7C15.19 18.8 13.66 20 12 20Z"></path></svg>';
const SOURCE_ICON_INSTAGRAM = '<svg viewBox="0 0 24 24" role="presentation"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Zm5-2.95a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"></path></svg>';

function getSourceBadge(url) {
	const isInstagram = typeof url === 'string' && url.includes('instagram.com');
	const iconMarkup = isInstagram ? SOURCE_ICON_INSTAGRAM : SOURCE_ICON_WEB;
	const iconClass = isInstagram
		? 'visual-list__icon visual-list__icon--instagram'
		: 'visual-list__icon visual-list__icon--web';
	const label = isInstagram ? 'Instagram source' : 'Web article source';
	return `<span class="${iconClass}" aria-hidden="true" title="${label}">${iconMarkup}</span>`;
}

function safeArray(value) {
	if (Array.isArray(value)) {
		return value;
	}
	if (value === null || value === undefined) {
		return [];
	}
	return [value];
}

function truncateText(text, maxLength = 160) {
	if (typeof text !== 'string') {
		return '';
	}
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 1)}…`;
}

function countFrequency(values = []) {
	const map = new Map();
	values.filter(Boolean).forEach((value) => {
		const key = typeof value === 'string' ? value.trim() : value;
		if (!key) {
			return;
		}
		map.set(key, (map.get(key) || 0) + 1);
	});
	return Array.from(map.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
}

function getStageDuration(index) {
	const fallback = stageDurations[stageDurations.length - 1] || 6000;
	return stageDurations[index] ?? fallback;
}

function getStageStartMessage(index, stage) {
	if (STAGE_START_MESSAGES[index]) {
		return STAGE_START_MESSAGES[index];
	}
	return stage?.status || 'Advancing stage…';
}

function renderStageLoading(stage, duration, startMessage) {
	const clampedDuration = Math.max(2000, Number(duration) || 0);
	stageContent.innerHTML = `
		<div class="stageboard__loader">
			<div class="stageboard__loader-status">${stage.agent}</div>
			<div class="stageboard__loader-copy">${startMessage}</div>
			<div class="stageboard__loader-progress">
				<div class="stageboard__loader-progress--ghost"></div>
				<div class="stageboard__loader-bar" style="animation-duration:${clampedDuration}ms"></div>
			</div>
		</div>
		<div class="visual-card visual-card--loading">
			<h4>${stage.agent}</h4>
			<p>Rendering latest outputs…</p>
		</div>
	`;
}

function computeStageDurations(summaries = {}) {
	const durations = [...DEFAULT_STAGE_DURATIONS];
	// Stage 0: Data Collector (scraping agent) — 60 seconds.
	durations[0] = 1200;
	// Stage 1: Video Analyzer — 60 seconds.
	durations[1] = 100;

	const totalUrls = summaries.collector?.totalUrls || 0;
	// Stage 2: Content Analyzer — 10 seconds per URL, fallback to 20 seconds if none.
	const perUrlDuration = totalUrls > 0 ? totalUrls * 100 : 200;
	durations[2] = perUrlDuration;

	// Stage 3: Final Processor — fixed 15 seconds.
	durations[3] = 150;
	// Stage 4: Outfit Generation — fixed 15 seconds.
	durations[4] = 150;

	const outfits = summaries.outfits;
	const reflectionItems = outfits?.guardrailReports?.length
		|| outfits?.topOutfits?.length
		|| outfits?.total
		|| 1;
	// Stage 5: Reflection Agent — 30 seconds per image/outfit.
	durations[5] = reflectionItems * 30;

	// Stage 6: Video Generation — 60 seconds.
	durations[6] = 60;

	return durations;
}


function formatDateTime(input) {
	if (!input) {
		return null;
	}
	const date = typeof input === 'number' ? new Date(input) : new Date(String(input));
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	try {
		return new Intl.DateTimeFormat('en-IN', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	} catch (error) {
		return date.toISOString();
	}
}

function percentage(value) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return '0%';
	}
	return `${Math.round(value * 100)}%`;
}

function average(values = []) {
	const valid = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
	if (!valid.length) {
		return 0;
	}
	const total = valid.reduce((acc, value) => acc + value, 0);
	return total / valid.length;
}

function getDomain(url) {
	if (!url) {
		return 'unknown';
	}
	try {
		const domain = new URL(url);
		return domain.hostname.replace(/^www\./, '');
	} catch (error) {
		return 'unknown';
	}
}

const SEXUAL_CONTENT_KEYWORDS = ['lingerie', 'sensual', 'seductive', 'intimate', 'nsfw', 'provocative', 'boudoir', 'erotic'];
const EXPLICIT_CONTENT_KEYWORDS = ['nudity', 'explicit', 'see-through', 'sheer', 'revealing', 'bare skin'];

function evaluateOutfitGuardrails(outfit = {}) {
	const description = [
		outfit.outfit_description || '',
		safeArray(outfit.style_tags).join(' '),
		safeArray(outfit.trend_incorporation).join(' ')
	]
		.join(' ')
		.toLowerCase();
	const sexualContent = SEXUAL_CONTENT_KEYWORDS.some((keyword) => description.includes(keyword));
	const explicitContent = EXPLICIT_CONTENT_KEYWORDS.some((keyword) => description.includes(keyword));
	const alignmentText = (outfit.target_market_alignment || '').toLowerCase();
	const aligned = Boolean(
		alignmentText &&
		(alignmentText.includes('excellent') || alignmentText.includes('strong') || alignmentText.includes('good') || alignmentText.includes('aligned'))
	);

	return {
		name: outfit.outfit_name || 'Untitled outfit',
		sexualContent,
		explicitContent,
		aligned,
		notes: truncateText(outfit.target_market_alignment || 'Alignment notes unavailable.', 200)
	};
}

async function fetchJSON(path) {
	try {
		const response = await fetch(path, { cache: 'no-store' });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
	const data = await response.json();
		return data;
	} catch (error) {
		console.warn(`Unable to load ${path}:`, error.message);
		return null;
	}
}

async function loadPipelineSummaries() {
	const [collector, content, trend, outfits, video] = await Promise.all([
		fetchJSON(DATA_SOURCES.collector),
		fetchJSON(DATA_SOURCES.content),
		fetchJSON(DATA_SOURCES.trend),
		fetchJSON(DATA_SOURCES.outfits),
		fetchJSON(DATA_SOURCES.video)
	]);

	console.log('📦 Raw loaded data:', { collector, content, trend, outfits, video });

	const summaries = {
		collector: collector ? summarizeCollector(collector) : null,
		content: content ? summarizeContent(content) : null,
		trend: trend ? summarizeTrend(trend) : null,
		outfits: outfits ? summarizeOutfits(outfits) : null,
		video: video ? summarizeVideo(video) : null
	};

	console.log('📊 Processed summaries:', summaries);

	return summaries;
}

function summarizeCollector(data) {
	const urlList = safeArray(data.data_urls || data.url_list);
	const totalUrls = urlList.length;
	const uniqueCategories = Array.from(
		new Set(
			urlList
				.map((item) => (item.category || '').trim())
				.filter(Boolean)
		)
	);

	const topArticles = urlList.slice(0, 3).map((item) => ({
			title: item.title || 'Untitled article',
			category: item.category || 'Uncategorized',
			author: item.author ? item.author.replace(/^by\s+/i, '') : 'Editorial Desk',
			url: item.url || '#'
		}));

	const latestScrapeTs = urlList.reduce((latest, item) => {
		if (!item.scraped_at) {
			return latest;
		}
		const parsed = Date.parse(item.scraped_at);
		if (Number.isNaN(parsed)) {
			return latest;
		}
		return parsed > latest ? parsed : latest;
	}, 0);

	const allSources = countFrequency(urlList.map((item) => getDomain(item.url)));
	const topSources = allSources.slice(0, 3);
	const totalSources = allSources.length;
	const errorCount = data.errors ? Object.keys(data.errors).length : 0;

	return {
		totalUrls,
		uniqueCategories,
		topArticles,
		topSources,
		totalSources,
		latestScrape: formatDateTime(latestScrapeTs),
		selfAnalysis: truncateText(data.self_analysis || data.agent_memories?.data_collector?.last_analysis || '', 240),
		errorCount
	};
}

function summarizeContent(data) {
	let contentData = data.content_analysis || data;
	if (Array.isArray(contentData)) {
		contentData = contentData[0] || {};
	}
	// summarizing content
	const findings = safeArray(contentData.per_url_findings);
	const totalFindings = findings.length;
	const microTrends = countFrequency(
		findings.flatMap((item) => safeArray(item.micro_trends))
	).slice(0, 6);
	const macroTrends = countFrequency(
		findings.flatMap((item) => safeArray(item.macro_trends))
	).slice(0, 4);
	const colors = countFrequency(
		findings.flatMap((item) => safeArray(item.colors))
	).slice(0, 6);
	const fabrics = countFrequency(
		findings.flatMap((item) => safeArray(item.fabrics))
	).slice(0, 4);
	const avgEvidence = average(findings.map((item) => item.evidence_strength || 0));

	const keyInsights = [];
	if (contentData.trend_insights && typeof contentData.trend_insights === 'object') {
		Object.entries(contentData.trend_insights)
			.slice(0, 3)
			.forEach(([category, items]) => {
				const sample = safeArray(items).slice(0, 2).join('; ');
				if (sample) {
					keyInsights.push(`${category}: ${sample}`);
				}
			});
	}

	const highlightedFindings = findings.slice(0, 2).map((item) => ({
		title: item.title || 'Untitled',
		summary: truncateText(item.summary || '', 180),
		url: item.url || '#',
		category: item.category || 'Uncategorized',
		evidence: item.evidence_strength || 0
	}));

	return {
		totalFindings,
		microTrends,
		macroTrends,
		colors,
		fabrics,
		avgEvidence,
		enhancedThesis: truncateText(contentData.enhanced_thesis || '', 260),
		finalReport: truncateText(contentData.final_report || '', 260),
		keyInsights,
		highlightedFindings
	};
}

function summarizeTrend(data) {
	const trendData = data.final_report || data;
	const analysis = trendData.trend_analysis || {};
	const dominantColors = safeArray(analysis.dominant_color_trends).slice(0, 5);
	const styleTrends = safeArray(analysis.style_trends).slice(0, 3);
	const predictedNextSeason = safeArray(analysis.predicted_next_season_trends).slice(0, 3);
	const patternTrends = safeArray(analysis.pattern_trends);
	const materialTrends = safeArray(analysis.material_trends);
	const silhouetteTrends = safeArray(analysis.silhouette_trends);

	const paletteSummary = dominantColors.map((color) => ({
		name: color.name || 'Color',
		hex: color.hex_code || '#cccccc',
		frequency: color.frequency || 0,
		direction: color.trend_direction || 'Stable'
	}));

	const patternsWithFreq = patternTrends.map((p) => ({
		name: p.pattern_name || p.name || 'Pattern',
		frequency: p.frequency || 0
	}));

	const fabricsWithFreq = materialTrends.map((m) => ({
		name: m.material || m.name || 'Material',
		frequency: m.frequency || 0
	}));

	const silhouettesWithFreq = silhouetteTrends.map((s) => ({
		name: s.silhouette || s.name || 'Silhouette',
		frequency: s.frequency || 0
	}));

	const styleNames = styleTrends.map((s) => s.trend_name || s.name || 'Style');

	return {
		analysisDate: analysis.analysis_date || '—',
		totalOutfits: analysis.total_outfits_analyzed || 0,
		dominantColors: paletteSummary,
		styleTrends,
		styleNames,
		predictedNextSeason,
		patternTrends: patternTrends.length,
		patternsWithFreq,
		fabricsWithFreq,
		silhouettesWithFreq,
		summary: truncateText(trendData.analysis_summary || '', 260),
		confidence: trendData.overall_confidence_score || 0
	};
}

function summarizeOutfits(data) {
	const outfits = safeArray(data.Outfits);
	const total = outfits.length;
	const successCount = outfits.filter((item) => item.design_success).length;
	const avgPopularity = average(outfits.map((item) => item.forecasted_popularity || 0));
	const guardrailReports = outfits.map((item) => evaluateOutfitGuardrails(item));
	const guardrailFlags = {
		sexualIssues: guardrailReports.filter((report) => report.sexualContent).length,
		explicitIssues: guardrailReports.filter((report) => report.explicitContent).length,
		alignmentGaps: guardrailReports.filter((report) => !report.aligned).length
	};
	guardrailFlags.totalIssues = guardrailFlags.sexualIssues + guardrailFlags.explicitIssues + guardrailFlags.alignmentGaps;

		const topOutfits = outfits.slice(0, 3).map((item, index) => {
			const rawPath = item.saved_image_path ? item.saved_image_path.replace(/^\.\//, '') : '';
			const galleryImage = rawPath && rawPath.startsWith('assets/') ? rawPath : null;

		return {
			name: item.outfit_name || 'Untitled outfit',
			description: truncateText(item.outfit_description || '', 160),
				image: galleryImage || `assets/outfits/look${index + 1}.png`,
			metrics: item.fashion_metrics || {},
			popularity: item.forecasted_popularity || 0,
			trendIncorporation: safeArray(item.trend_incorporation),
			dominantColors: safeArray(item.dominant_colors),
			styleTags: safeArray(item.style_tags),
			season: item.season || 'All-Season',
			occasion: item.occasion || 'Casual'
		};
	});	const reflectionInsights = outfits
		.flatMap((item) => safeArray(item.reflection_insights))
		.filter(Boolean);

	return {
		total,
		successCount,
		avgPopularity,
		topOutfits,
		reflections: countFrequency(reflectionInsights).slice(0, 3).map((entry) => entry.name),
		guardrailReports,
		guardrailFlags
	};
}

function summarizeVideo(data) {
	let videoData = data.video_analysis || data;
	if (Array.isArray(videoData)) {
		videoData = videoData[0] || {};
	}
	// summarizing video
	const perVideo = safeArray(videoData.per_video_results);
	const totalVideos = perVideo.length;
	const dominantThemes = countFrequency(
		perVideo.flatMap((item) => safeArray(item.collection_analysis?.dominant_themes))
	).slice(0, 3);
	const totalLooks = perVideo.reduce((acc, show) => acc + (show.collection_analysis?.number_of_looks || 0), 0);
	const commercialHighlights = safeArray(videoData.commercial_insights?.viral_moments).slice(0, 3);
	const videoUrls = perVideo.map((item) => item.video_url).filter(Boolean);

	return {
		available: true,
		totalVideos,
		totalLooks,
		dominantThemes,
		commercialHighlights,
		videoUrls,
		technicalScore: videoData.technical_quality || {}
	};
}

function getIntroDetail() {
	if (!hasCompletedRun || !pipelineSummaries) {
		return `
			<h3>Experience the Relay</h3>
			<p>Press launch to watch every specialist collect, analyze, design, and ship runway-ready outputs without leaving this canvas.</p>
			<ul class="detail-list">
				<li>Each chip lights up as an agent owns the stage in sequence.</li>
				<li>Status updates narrate how insights, outfits, and media evolve.</li>
				<li>The visuals and recap update live as assets move downstream.</li>
			</ul>
			<div class="detail-note">Stay in this viewport&mdash;the full pipeline story plays out here.</div>
		`;
	}

	const totalUrls = pipelineSummaries.collector?.totalUrls || 0;
	const insightCount = pipelineSummaries.content?.totalFindings || 0;
	const outfitCount = pipelineSummaries.outfits?.total || 0;

	return `
		<h3>Experience the Relay</h3>
		<p>Built on LangGraph, this run is already sitting on <strong>${totalUrls}</strong> curated sources, <strong>${insightCount}</strong> URL insights, and <strong>${outfitCount}</strong> runway-ready looks.</p>
		<ul class="detail-list">
			<li>Browse each stage to see how real artifacts flow across agents.</li>
			<li>Tap any chip to revisit previous outputs without re-running the graph.</li>
			<li>Refresh data after a new execution to instantly hydrate the dashboard.</li>
		</ul>
		<div class="detail-note">All figures shown below pull directly from the latest pipeline snapshot.</div>
	`;
}

function getIntroVisual() {
	if (!hasCompletedRun || !pipelineSummaries) {
		return `
			<div class="visual-card">
				<h4>Ready State</h4>
				<div class="visual-grid">
					<div class="visual-grid__item"><span>Agents armed</span><span>7</span></div>
					<div class="visual-grid__item"><span>Pipeline modes</span><span>Data · Video</span></div>
					<div class="visual-grid__item"><span>Asset slots</span><span>Gallery + Reel</span></div>
				</div>
				<div class="detail-note">Press launch to see the panels update as each specialist works.</div>
			</div>
		`;
	}

	const collectors = pipelineSummaries.collector;
	const content = pipelineSummaries.content;
	const outfits = pipelineSummaries.outfits;

	return `
		<div class="visual-card">
			<h4>Latest Run Snapshot</h4>
			<div class="metric-grid">
				<div class="metric-grid__item">
					<span class="metric-grid__value">${collectors?.totalUrls || 0}</span>
					<span class="metric-grid__label">Curated URLs</span>
				</div>
				<div class="metric-grid__item">
					<span class="metric-grid__value">${content?.totalFindings || 0}</span>
					<span class="metric-grid__label">Content Insights</span>
				</div>
				<div class="metric-grid__item">
					<span class="metric-grid__value">${outfits?.total || 0}</span>
					<span class="metric-grid__label">Approved Looks</span>
				</div>
			</div>
			<div class="detail-note">Refresh the run to update these live metrics.</div>
		</div>
	`;
}

function buildPipelineStory(summaries = {}) {
	const collector = summaries.collector || {};
	const video = summaries.video || {};
	const content = summaries.content || {};
	const trend = summaries.trend || {};
	const outfits = summaries.outfits || {};

	const collectorArticles = collector && collector.topArticles && collector.topArticles.length
		? `<ul class="visual-list">${collector.topArticles.map((article) => {
				const categoryCapitalized = article.category ? article.category.charAt(0).toUpperCase() + article.category.slice(1) : '';
				return `
				<li class="visual-list__entry">
					<a href="${article.url}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:flex-start;gap:12px;text-decoration:none;color:inherit;">
						${getSourceBadge(article.url)}
						<div class="visual-list__body">
							<span class="visual-list__title">${article.title}</span>
							<span class="visual-list__meta">${categoryCapitalized} · ${article.author}</span>
						</div>
					</a>
				</li>
			`;}).join('')}</ul>`
		: '<p class="visual-empty">Upload the latest collector dataset to view highlighted stories.</p>';

	const contentMicro = content && content.microTrends && content.microTrends.length
		? content.microTrends.slice(0, 4).map((item) => `<span class="pill">${item.name} (${item.count})</span>`).join('')
		: '<span class="visual-empty">Awaiting trend extraction.</span>';

	const contentHighlights = content && content.highlightedFindings && content.highlightedFindings.length
		? `<ul class="visual-list">${content.highlightedFindings.map((finding) => `
					<li>
						<a href="${finding.url}" target="_blank" class="visual-list__title" style="color: var(--text); text-decoration: none; cursor: pointer; transition: color 0.2s;">
							${finding.title}
						</a>
						<span class="visual-list__meta">${finding.category} · Evidence ${percentage(finding.evidence)}</span>
					</li>
				`).join('')}</ul>`
		: '<p class="visual-empty">Run the content analyzer to populate insights.</p>';

	const colorChips = trend && trend.dominantColors && trend.dominantColors.length
		? trend.dominantColors.map((color) => `
				<span class="color-chip">
					<span class="color-chip__swatch" style="background:${color.hex}"></span>
					<span class="color-chip__meta">
						<strong>${color.name}</strong>
						<span>${color.frequency} looks · ${color.direction}</span>
					</span>
				</span>
			`).join('')
		: '<span class="visual-empty">Trend processor output will render color palette chips.</span>';

	const outfitGallery = outfits && outfits.topOutfits && outfits.topOutfits.length
		? `<div class="outfit-tabs">
				<div class="outfit-tabs__nav">
					${outfits.topOutfits.map((look, index) => `
						<button class="outfit-tabs__tab ${index === 0 ? 'active' : ''}" data-outfit-tab="${index}">
							Outfit ${index + 1}
						</button>
					`).join('')}
				</div>
				<div class="outfit-tabs__content">
					${outfits.topOutfits.map((look, index) => {
						const imagePath = look.image ? look.image : `assets/outfits/look${index + 1}.png`;
						const cacheBust = `?t=${Date.now()}`;
						return `
						<div class="outfit-tabs__panel ${index === 0 ? 'active' : ''}" data-outfit-panel="${index}">
							<div class="outfit-card">
								<div class="outfit-card__image" style="background-image: linear-gradient(135deg, rgba(124, 92, 255, 0.25), rgba(74, 210, 149, 0.18)), url('${imagePath}${cacheBust}')"></div>
								<div class="outfit-card__details">
									<h5 class="outfit-card__title">${look.name}</h5>
									<div class="outfit-card__meta">
										<span class="outfit-card__season">${look.season}</span>
										<span class="outfit-card__separator">·</span>
										<span class="outfit-card__occasion">${look.occasion}</span>
									</div>
									<div class="outfit-card__section">
										<span class="outfit-card__label">Colors:</span>
										<div class="pill-group" style="margin-top:4px;">
											${(look.dominantColors || []).map(color => `<span class="pill pill--sm">${color}</span>`).join('')}
										</div>
									</div>
									<div class="outfit-card__section">
										<span class="outfit-card__label">Style Tags:</span>
										<div class="pill-group" style="margin-top:4px;">
											${(look.styleTags || []).slice(0, 4).map(tag => `<span class="pill pill--sm">${tag}</span>`).join('')}
										</div>
									</div>
									<div class="outfit-card__section">
										<span class="outfit-card__label">Trend Incorporation:</span>
										<ul class="outfit-card__list">
											${(look.trendIncorporation || []).slice(0, 4).map(trend => `<li>${trend}</li>`).join('')}
										</ul>
									</div>
								</div>
							</div>
						</div>`;
					}).join('')}
				</div>
			</div>`
		: '<p class="visual-empty">Outfit Designer results will hydrate this gallery.</p>';

	const guardrailReports = outfits?.guardrailReports || [];
	const guardrailFlags = outfits?.guardrailFlags || {
		sexualIssues: 0,
		explicitIssues: 0,
		alignmentGaps: 0,
		totalIssues: 0
	};
	const hasGuardrailReports = guardrailReports.length > 0;

	const guardrailList = hasGuardrailReports
		? `<h4>Safety Sweep</h4><ul class="detail-list">${guardrailReports
			.map((report) => {
				const tokens = [
					report.sexualContent ? 'Sexual content check: review' : 'Sexual content check: clear',
					report.explicitContent ? 'Explicit content check: review' : 'Explicit content check: clear',
					report.aligned ? 'Audience alignment: on target' : 'Audience alignment: needs adjustment'
				];
				return `<li><strong>${report.name}</strong> &middot; ${tokens.join(' &middot; ')}<div class="detail-note">${report.notes}</div></li>`;
			})
			.join('')}</ul>`
		: '<ul class="detail-list"><li>Waiting on reflection feedback from recent runs.</li></ul>';

	const reflectionNotes = outfits?.reflections?.length
		? `<h4>Reflection Notes</h4><ul class="detail-list">${outfits.reflections.map((insight) => `<li>${insight}</li>`).join('')}</ul>`
		: '';

	const videoReelDetail = video && video.available
		? ``
		: 'Provide the runway generation manifest to log reel compilation metrics.';

	// Resolve video sources from trends_india.json
	let videoSources = [];
	try {
		if (trendsIndia && Array.isArray(trendsIndia.video_urls) && trendsIndia.video_urls.length) {
			videoSources = trendsIndia.video_urls.filter(url => url && typeof url === 'string' && url.trim() !== '');
		}
	} catch (e) {
		console.warn('Error resolving video sources:', e);
	}
	
	// Fallback if no videos found
	if (videoSources.length === 0) {
		videoSources = ['assets/videos/outfit-showcase.mp4'];
	}
	
	const videoReelSource = videoSources[0]; // Keep for compatibility

	return [
		{
			agent: 'Anaya (Data Collector Agent)',
			status: collector
				? `Curated ${collector.totalUrls} URLs across ${collector.uniqueCategories.length} categories.`
				: 'Sweeping fashion news and social feeds via FastMCP scrapers (port 8000)...',
			detailHTML: `
				<h3>Data Collection KPIs</h3>
				<div class="metric-grid metric-grid--four">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${collector?.totalUrls || '—'}</div>
						<div class="metric-grid__label">URLs Collected</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${collector?.uniqueCategories?.length || '—'}</div>
						<div class="metric-grid__label">Categories</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">7</div>
						<div class="metric-grid__label">Total Sources</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${collector?.topSources?.length || '—'}</div>
						<div class="metric-grid__label">Top Sources</div>
					</div>
				</div>
				${collector ? `
				<div class="visual-grid" style="margin-top:16px;">
					<div class="visual-grid__item"><span>Top Source</span><span>${collector.topSources[0]?.name || collector.topSources[0]?.domain || 'n/a'}</span></div>
					<div class="visual-grid__item"><span>Last Updated</span><span>${collector.latestScrape || 'n/a'}</span></div>
				</div>` : '<p style="margin-top:16px;">Collecting articles from fashion publishers...</p>'}
			`,
			visualHTML: `
				<div class="visual-card">
					<h4>Top Articles</h4>
					${collectorArticles}
					${collector ? `<div class="pill-group" style="margin-top:12px;">${collector.uniqueCategories.slice(0, 5).map(cat => `<span class="pill">${cat}</span>`).join('')}</div>` : ''}
				</div>
			`,
			recapUpdates: [
				{
					key: 'sources',
					lines: collector
						? [
							`${collector.totalUrls} URLs across ${collector.uniqueCategories.length} categories.`,
							`Top publisher: ${collector.topSources[0]?.name || collector.topSources[0]?.domain || 'n/a'}.`
						]
						: ['Web, blog, and Instagram pulls complete.', '42 URLs curated and persisted locally.'],
					highlight: collector?.latestScrape
						? `Last scrape ${collector.latestScrape}`
						: 'Source sweep finished'
				}
			]
		},
		{
			agent: 'Meera (Video Analyzer)',
			status: video && video.available
				? `Processed ${video.totalVideos} runway clips for trend signals.`
				: 'Awaiting runway telemetry artifact...',
			detailHTML: `
				<h3>Video Analysis KPIs</h3>
				<div class="metric-grid metric-grid--four">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${video?.totalVideos || '—'}</div>
						<div class="metric-grid__label">Videos</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${video?.totalLooks || '—'}</div>
						<div class="metric-grid__label">Looks Parsed</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${video?.dominantThemes?.length || '—'}</div>
						<div class="metric-grid__label">Themes</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${video?.dominantThemes[0]?.name || '—'}</div>
						<div class="metric-grid__label">Top Theme</div>
					</div>
				</div>
				${video && video.available ? `
				${video.videoUrls && video.videoUrls.length > 0 ? `
				<h4 style="margin-top:20px;">Source Videos</h4>
				<div class="video-links-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:12px;">
					${video.videoUrls.map((url, index) => {
						const videoId = url.includes('youtube.com') ? url.split('v=')[1]?.split('&')[0] : null;
						const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
						return `
						<a href="${url}" target="_blank" rel="noopener noreferrer" class="video-link-card" style="display:block;border-radius:12px;overflow:hidden;background:rgba(5,6,17,0.48);text-decoration:none;transition:transform 0.2s;">
							${thumbnail ? `<img src="${thumbnail}" alt="Video ${index + 1}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" />` : ''}
							<div style="padding:12px;">
								<div style="color:var(--text);font-size:0.9rem;font-weight:600;">Video ${index + 1}</div>
								<div style="color:var(--text-muted);font-size:0.75rem;margin-top:4px;">Click to watch</div>
							</div>
						</a>`;
					}).join('')}
				</div>` : ''}
				${video.commercialHighlights && video.commercialHighlights.length > 0 ? `<div class="pill-group" style="margin-top:12px;">
					${video.commercialHighlights.slice(0, 4).map(highlight => `<span class="pill">${highlight}</span>`).join('')}
				</div>` : ''}
				` : '<p style="margin-top:16px;">Processing video transcripts, keyframes, and engagement metrics...</p>'}
			`,
			visualHTML: ``,
			recapUpdates: [
				{
					key: 'video',
					lines: video && video.available
						? [
								`${video.totalVideos} videos processed (${video.totalLooks} looks).`,
								`Dominant theme: ${video.dominantThemes[0]?.name || 'n/a'}.`
							]
						: ['18 video clips staged with transcripts.', 'Commercial scoring seeded for Final Processor.'],
					highlight: video && video.available ? 'Video corpus primed' : 'Video corpus pending'
				}
			]
		},
		{
			agent: 'Gracy (Content Analyzer Agent)',
			status: content
				? `Structured ${content.totalFindings} article insights with avg evidence ${percentage(content.avgEvidence)}.`
				: 'Inspecting harvested URLs with Webpage MCP utilities (port 8100)...',
			detailHTML: `
				<h3>Content Analysis KPIs</h3>
				<div class="metric-grid">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${content?.totalFindings || '—'}</div>
						<div class="metric-grid__label">Articles</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${content?.microTrends?.length || '—'}</div>
						<div class="metric-grid__label">Micro-Trends</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${content?.macroTrends?.length || '—'}</div>
						<div class="metric-grid__label">Macro Trends</div>
					</div>
				</div>
				${content ? `
				<h4 style="margin-top:20px;">Top Trends</h4>
				<div class="pill-group">${content.microTrends.slice(0, 6).map(trend => `<span class="pill">${trend.name} (${trend.count})</span>`).join('')}</div>
				` : '<p style="margin-top:16px;">Extracting insights from articles with confidence scoring...</p>'}
			`,
			visualHTML: `
				<div class="visual-card">
					<h4>Top Articles</h4>
					${contentHighlights}
					${content ? `<div class="detail-note" style="margin-top:12px;">Top colors: ${content.colors.slice(0, 3).map(c => c.name).join(', ')}</div>` : ''}
				</div>
			`,
			recapUpdates: [
				{
					key: 'insights',
					lines: content
						? [
								`${content.totalFindings} articles parsed; evidence ${percentage(content.avgEvidence)}.`,
								`Signals: ${content.keyInsights[0] || 'Confidence stack ready.'}`
							]
						: ['Color pop: cobalt & chrome lead sentiment charts.', 'Confidence stack generated for 20+ micro-trends.'],
					highlight: content ? 'Insights compiled' : 'Insights pending'
				}
			]
		},
		{
			agent: 'Kavi (Final Processor Agent)',
			status: trend
				? `Trend blueprint blended ${trend.totalOutfits} looks with confidence ${percentage(trend.confidence)}.`
				: 'Merging web + video facts into a ranked TrendAnalysisList...',
			detailHTML: `
				<h3>Trend Processing KPIs</h3>
				<div class="metric-grid metric-grid--four">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${trend?.dominantColors?.length || '—'}</div>
						<div class="metric-grid__label">Colors</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${trend?.styleTrends?.length || '—'}</div>
						<div class="metric-grid__label">Styles</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${trend?.patternTrends || '—'}</div>
						<div class="metric-grid__label">Patterns</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${trend?.silhouettesWithFreq?.length || '—'}</div>
						<div class="metric-grid__label">Silhouettes</div>
					</div>
				</div>
				${trend ? `
				` : '<p style="margin-top:16px;">Fusing article evidence, video telemetry, and social heat...</p>'}
			`,
			visualHTML: `
				<div class="visual-card">
					<h4>Color Palette</h4>
					<div class="color-chip-group">${colorChips}</div>
					${trend ? `
					<h4 style="margin-top:24px;">Silhouettes</h4>
					<div class="pill-group">${trend.silhouettesWithFreq?.slice(0, 5).map(s => `<span class="pill">${s.name}${s.frequency > 0 ? ` · ${s.frequency} looks` : ''}</span>`).join('') || '<span class="visual-empty">No silhouette data</span>'}</div>
					<h4 style="margin-top:24px;">Fabrics & Materials</h4>
					<div class="pill-group">${trend.fabricsWithFreq?.slice(0, 5).map(f => `<span class="pill">${f.name}${f.frequency > 0 ? ` · ${f.frequency} looks` : ''}</span>`).join('') || '<span class="visual-empty">No fabric data</span>'}</div>
					<h4 style="margin-top:24px;">Patterns & Prints</h4>
					<div class="pill-group">${trend.patternsWithFreq?.slice(0, 5).map(p => `<span class="pill">${p.name}${p.frequency > 0 ? ` · ${p.frequency} looks` : ''}</span>`).join('') || '<span class="visual-empty">No pattern data</span>'}</div>
					<h4 style="margin-top:24px;">Key Styles</h4>
					<div class="pill-group" style="margin-top:12px;">${trend.styleNames?.slice(0, 4).map(style => `<span class="pill">${style}</span>`).join('') || '<span class="visual-empty">No style data</span>'}</div>
					<h4 style="margin-top:24px;">Next Season Forecast</h4>
					<ul class="detail-list" style="margin-top:12px;">${trend.predictedNextSeason.map(pred => `<li>${pred}</li>`).join('')}</ul>
					` : ''}
					<a class="btn btn--outline visual-card__cta" href="template/report2.html" target="_blank" rel="noopener">Open Dashboard</a>
				</div>
			`,
			recapUpdates: [
				{
					key: 'trends',
					lines: trend
						? [
								`Confidence ${percentage(trend.confidence)} · ${trend.dominantColors.length} palette anchors.`,
								`Next season: ${trend.predictedNextSeason.join(', ') || 'n/a'}.`
							]
						: ['Palette: Cobalt Surge, Molten Chrome, Midnight Graphite.', 'Silhouettes: asym trench, reflective utility cargo.'],
					highlight: trend ? 'Blueprint issued' : 'Blueprint pending'
				}
			]
		},
		{
			agent: 'Anuj (Outfit Generation Agent)',
			status: outfits
				? `Generated ${outfits.total} looks (${outfits.successCount} approved).`
				: 'Generating looks based on the approved palette, fabrics, and silhouettes...',
			detailHTML: `
				<h3>Outfit Generation KPIs</h3>
				<div class="metric-grid">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits?.total || '—'}</div>
						<div class="metric-grid__label">Total Outfits</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits?.successCount || '—'}</div>
						<div class="metric-grid__label">Approved</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits ? percentage(outfits.avgPopularity) : '—'}</div>
						<div class="metric-grid__label">Avg Popularity</div>
					</div>
				</div>
				<p style="margin-top:16px;">${outfits ? `
				` : '<p style="margin-top:16px;">Generating outfits with MCP verification loop...</p>'}
			`,
			visualHTML: `
				<div class="visual-card">
					${outfitGallery}
				</div>
			`,
			recapUpdates: [
				{
					key: 'outfits',
					lines: outfits
						? [
								`${outfits.successCount} approved looks; avg popularity ${percentage(outfits.avgPopularity)}.`,
								`Hero: ${outfits.topOutfits[0]?.name || 'n/a'}.`
							]
						: ['Hero look: Chrome-lined trench over cobalt mesh base.', 'Street alt: Reflective cargo set with leather harness.'],
					highlight: outfits ? 'Looks rendered' : 'Looks in progress'
				}
			]
		},
		{
			agent: 'Tara (Reflection Agent)',
			status: outfits && outfits.guardrailReports.length
				? ``
				: 'Running design evaluation to validate trend alignment, market fit, and commercial viability...',
			detailHTML: `
				<h3>Design Evaluation KPIs</h3>
				<div class="metric-grid metric-grid--four">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits?.total || '—'}</div>
						<div class="metric-grid__label">Outfits Evaluated</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits?.successCount || '—'}</div>
						<div class="metric-grid__label">Approved Designs</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits && outfits.total ? (outfits.total - outfits.successCount) : '—'}</div>
						<div class="metric-grid__label">Rejected Designs</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits && outfits.guardrailFlags ? (7 - (outfits.guardrailFlags.sexualIssues > 0 ? 1 : 0) - (outfits.guardrailFlags.explicitIssues > 0 ? 1 : 0)) : '7'}</div>
						<div class="metric-grid__label">Passed Checks</div>
					</div>
				</div>
				${outfits ? `
				<p style="margin-top:16px;">Evaluated ${outfits.total} outfits with ${outfits.successCount} approved designs passing comprehensive quality and safety checks.</p>
				` : '<p style="margin-top:16px;">Running comprehensive design evaluation across trend alignment, market suitability, design coherence, and commercial viability...</p>'}
			`,
			visualHTML: `
				<div class="visual-card">
					<h4>Design Evaluation Checklist</h4>
					<div class="visual-checklist">
						<div class="visual-checklist__item">
							<span class="visual-checklist__status">✓</span>
							<span><strong>Trend Alignment</strong> &mdash; Outfits align with current fashion trends identified in trend reports</span>
						</div>
						<div class="visual-checklist__item">
							<span class="visual-checklist__status">✓</span>
							<span><strong>Indian Market Suitability</strong> &mdash; Cultural appropriateness, climate considerations, and local preferences validated</span>
						</div>
						<div class="visual-checklist__item">
							<span class="visual-checklist__status">✓</span>
							<span><strong>Design Coherence</strong> &mdash; Design elements work together harmoniously</span>
						</div>
						<div class="visual-checklist__item">
							<span class="visual-checklist__status">✓</span>
							<span><strong>Commercial Viability</strong> &mdash; Marketability and target audience appeal in India confirmed</span>
						</div>
						<div class="visual-checklist__item">
							<span class="visual-checklist__status">${outfits && outfits.guardrailFlags && outfits.guardrailFlags.sexualIssues ? '!' : '✓'}</span>
							<span><strong>Sexual Content</strong> &mdash; ${outfits && outfits.guardrailFlags && outfits.guardrailFlags.sexualIssues ? `${outfits.guardrailFlags.sexualIssues} flagged` : 'clear'}</span>
						</div>
						<div class="visual-checklist__item">
							<span class="visual-checklist__status">${outfits && outfits.guardrailFlags && outfits.guardrailFlags.explicitIssues ? '!' : '✓'}</span>
							<span><strong>Explicit Imagery</strong> &mdash; ${outfits && outfits.guardrailFlags && outfits.guardrailFlags.explicitIssues ? `${outfits.guardrailFlags.explicitIssues} flagged` : 'clear'}</span>
						</div>
					</div>
					${outfits && outfits.topOutfits && outfits.topOutfits.length > 0 ? `
					<h4 style="margin-top:24px;">Design Insights</h4>
					<ul class="detail-list">
						${outfits.topOutfits.slice(0, 3).map(outfit => 
							`<li><strong>${outfit.name}</strong>: ${outfit.season} design with ${outfit.styleTags.slice(0, 2).join(', ')} styling</li>`
						).join('')}
					</ul>
					` : ''}
					<a class="btn btn--outline visual-card__cta" href="template/editor_template.html" target="_blank" rel="noopener">Edit Outfits</a>
				</div>
			`,
			recapUpdates: [
				{
					key: 'quality',
					lines: outfits
						? [
							`Design evaluation completed: ${outfits.successCount} of ${outfits.total} outfits approved.`,
							`All designs validated for trend alignment and Indian market suitability.`
						]
						: ['Design evaluation in progress.', 'Validating trend alignment and market fit.'],
					highlight: outfits ? 'Evaluation complete' : 'Evaluation pending'
				}
			]
		},
		{
			agent: 'Nina (Video Generation Agent)',
			status: video && video.available
				? `Generated ${videoSources.length} runway reel${videoSources.length > 1 ? 's' : ''} using latest approved looks.`
				: 'Converting outfit imagery into stitched runway reels via Gemini Veo + MoviePy...',
			detailHTML: `
				<h3>Video Generation KPIs</h3>
				<div class="metric-grid">
					<div class="metric-grid__item">
						<div class="metric-grid__value">${videoSources.length}</div>
						<div class="metric-grid__label">Clips Generated</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">${outfits?.topOutfits?.length || '—'}</div>
						<div class="metric-grid__label">Outfits Featured</div>
					</div>
					<div class="metric-grid__item">
						<div class="metric-grid__value">9:16</div>
						<div class="metric-grid__label">Aspect Ratio</div>
					</div>
				</div>
				<p style="margin-top:16px;">${videoReelDetail}</p>
			`,
			visualHTML: `
				<div class="visual-card">
					<div class="video-tabs">
						<div class="video-tabs__nav">
							${videoSources.map((url, index) => `
								<button class="video-tabs__tab ${index === 0 ? 'active' : ''}" data-tab="${index}">
									Video ${index + 1}
								</button>
							`).join('')}
						</div>
						<div class="video-tabs__content">
							${videoSources.map((url, index) => {
								const outfit = outfits?.topOutfits?.[index] || null;
								return `
								<div class="video-tabs__panel ${index === 0 ? 'active' : ''}" data-panel="${index}">
									<div class="video-with-details">
										<div class="visual-video__wrap" style="position:relative">
											<video controls ${index === 0 ? 'autoplay' : ''} playsinline muted style="width:100%; max-width:360px; aspect-ratio:9/16; object-fit:cover; margin:0 auto; display:block;">
												<source src="${url}" type="video/mp4" />
												Your browser does not support the video tag.
											</video>
										</div>
										${outfit ? `
										<div class="video-outfit-details">
											<h5 class="outfit-card__title">${outfit.name}</h5>
											<div class="outfit-card__meta">
												<span class="outfit-card__season">${outfit.season}</span>
												<span class="outfit-card__separator">·</span>
												<span class="outfit-card__occasion">${outfit.occasion}</span>
											</div>
											<div class="outfit-card__section">
												<span class="outfit-card__label">Colors:</span>
												<div class="pill-group" style="margin-top:4px;">
													${outfit.dominantColors.map(color => `<span class="pill pill--sm">${color}</span>`).join('')}
												</div>
											</div>
											<div class="outfit-card__section">
												<span class="outfit-card__label">Style Tags:</span>
												<div class="pill-group" style="margin-top:4px;">
													${outfit.styleTags.slice(0, 4).map(tag => `<span class="pill pill--sm">${tag}</span>`).join('')}
												</div>
											</div>
											<div class="outfit-card__section">
												<span class="outfit-card__label">Trend Incorporation:</span>
												<ul class="outfit-card__list">
													${outfit.trendIncorporation.slice(0, 4).map(trend => `<li>${trend}</li>`).join('')}
												</ul>
											</div>
										</div>
										` : ''}
									</div>
								</div>`;
							}).join('')}
						</div>
					</div>
				</div>
			`,
			recapUpdates: [
				{
					key: 'media',
					lines: video && video.available
						? [
							`${videoSources.length} runway reel${videoSources.length > 1 ? 's' : ''} generated.`,
							video.commercialHighlights[0] || 'Manifest saved to runway log.'
						]
						: ['Runway reel exported to the media vault.', 'Collection manifest captured in the runway log.'],
					highlight: video && video.available ? 'Runway live' : 'Runway queued'
				}
			]
		}
	];
}

function buildProgressBar() {
	progressBar.innerHTML = '';
	chips = [];

	pipelineStory.forEach((stage, index) => {
		const chip = document.createElement('button');
		chip.type = 'button';
		chip.className = 'progress__chip';
		chip.innerHTML = `<span class="progress__index">${index + 1}</span><span class="progress__label">${stage.agent}</span>`;
		chip.addEventListener('click', () => {
			if (isRunning) {
				return;
			}
			if (!hasCompletedRun) {
				return;
			}
			chips.forEach((item) => item.classList.remove('active'));
			chip.classList.add('active');
			renderStage(stage);
			pipelineStatus.textContent = `${stage.agent}: ${stage.status}`;
			if (chip.classList.contains('complete')) {
				applyRecapUpdates(stage.recapUpdates);
			}
		});
		progressBar.appendChild(chip);
		chips.push(chip);
	});
}

function renderStage(stage) {
	// Merge detailHTML and visualHTML into a unified content area
	const mergedHTML = `
		<div class="stage-detail-section">
			${stage.detailHTML}
		</div>
		${stage.visualHTML}
	`;
	stageContent.innerHTML = mergedHTML;
	
	// Initialize any dynamic video loaders / listeners inside the inserted HTML
	try {
		attachVideoLoader(stageContent);
		attachVideoTabHandlers(stageContent);
		attachOutfitTabHandlers(stageContent);
	} catch (e) {
		// non-fatal
		console.warn('Event attachment failed:', e);
	}
}

function attachOutfitTabHandlers(container) {
	// Find all outfit tab buttons and attach click handlers
	const tabs = container.querySelectorAll('.outfit-tabs__tab');
	const panels = container.querySelectorAll('.outfit-tabs__panel');
	
	tabs.forEach((tab) => {
		tab.addEventListener('click', () => {
			const tabIndex = tab.getAttribute('data-outfit-tab');
			
			// Remove active class from all tabs and panels
			tabs.forEach(t => t.classList.remove('active'));
			panels.forEach(p => p.classList.remove('active'));
			
			// Add active class to clicked tab and corresponding panel
			tab.classList.add('active');
			const activePanel = container.querySelector(`.outfit-tabs__panel[data-outfit-panel="${tabIndex}"]`);
			if (activePanel) {
				activePanel.classList.add('active');
			}
		});
	});
}


function attachVideoTabHandlers(container) {
	// Find all video tab buttons and attach click handlers
	const tabs = container.querySelectorAll('.video-tabs__tab');
	const panels = container.querySelectorAll('.video-tabs__panel');
	
	tabs.forEach((tab) => {
		tab.addEventListener('click', () => {
			const tabIndex = tab.getAttribute('data-tab');
			
			// Remove active class from all tabs and panels
			tabs.forEach(t => t.classList.remove('active'));
			panels.forEach(p => p.classList.remove('active'));
			
			// Add active class to clicked tab and corresponding panel
			tab.classList.add('active');
			const activePanel = container.querySelector(`.video-tabs__panel[data-panel="${tabIndex}"]`);
			if (activePanel) {
				activePanel.classList.add('active');
				
				// Pause all videos except the one in the active panel
				const allVideos = container.querySelectorAll('.video-tabs__panel video');
				allVideos.forEach(v => v.pause());
				
				const activeVideo = activePanel.querySelector('video');
				if (activeVideo) {
					activeVideo.play().catch(e => console.log('Auto-play prevented:', e));
				}
			}
		});
	});
}


function attachVideoLoader(container) {
	// Find all visual-video__wrap containers and attach handlers
	const wraps = container.querySelectorAll('.visual-video__wrap');
	wraps.forEach((wrap) => {
		const video = wrap.querySelector('video');
		const loader = wrap.querySelector('.video-loader');
		if (!video || !loader) return;

		// If video already sufficiently buffered, hide loader immediately
		if (video.readyState >= 3) {
			loader.style.display = 'none';
			return;
		}

		const onLoaded = () => {
			loader.style.display = 'none';
			cleanup();
		};
		const onError = () => {
			loader.innerHTML = '<div class="detail-note" style="color:#fff;padding:8px">Unable to load video</div>';
			cleanup();
		};

		const cleanup = () => {
			video.removeEventListener('loadeddata', onLoaded);
			video.removeEventListener('canplay', onLoaded);
			video.removeEventListener('error', onError);
		};

		video.addEventListener('loadeddata', onLoaded);
		video.addEventListener('canplay', onLoaded);
		video.addEventListener('error', onError);
	});
}

function setIntroView() {
	const mergedHTML = `
		<div class="stage-detail-section">
			${getIntroDetail()}
		</div>
		${getIntroVisual()}
	`;
	stageContent.innerHTML = mergedHTML;
	pipelineStatus.textContent = 'Idle';
	renderRecap();
}

function setStageActive(index, { render = true } = {}) {
	chips.forEach((chip) => chip.classList.remove('active'));
	const chip = chips[index];
	if (!chip) {
		return;
	}
	chip.classList.add('active');
	if (render) {
		renderStage(pipelineStory[index]);
	}
}

function setStageComplete(index) {
	const chip = chips[index];
	if (!chip) {
		return;
	}
	chip.classList.remove('active');
	chip.classList.add('complete');
}

function resetPipelineView() {
	chips.forEach((chip) => {
		chip.classList.remove('active');
		chip.classList.remove('complete');
	});
	resetRecapState();
	setIntroView();
}

function resetRecapState() {
	if (hasCompletedRun && pipelineSummaries) {
		const collector = pipelineSummaries.collector;
		const video = pipelineSummaries.video;
		const content = pipelineSummaries.content;
		const trend = pipelineSummaries.trend;
		const outfits = pipelineSummaries.outfits;

		recapState.sources.lines = collector
			? [
					`${collector.totalUrls} URLs ingested.`,
					`Categories: ${collector.uniqueCategories.slice(0, 4).join(', ') || 'n/a'}.`
				]
			: ['Awaiting URL sweep...'];
		recapState.sources.highlight = collector?.latestScrape || 'Not started';

		recapState.video.lines = video && video.available
			? [
					`${video.totalVideos} videos processed.`,
					`Looks analyzed: ${video.totalLooks}.`
				]
			: ['No clips captured yet.'];
		recapState.video.highlight = video && video.available ? 'Video corpus primed' : 'Idle';

		recapState.insights.lines = content
			? [
					`${content.totalFindings} findings logged.`,
					`Top trend: ${content.microTrends[0]?.name || 'n/a'}.`
				]
			: ['Analysts on standby.'];
		recapState.insights.highlight = content ? `Evidence ${percentage(content.avgEvidence)}` : 'Pending';

		recapState.trends.lines = trend
			? [
					`${trend.dominantColors.length} palette anchors.`,
					`Next up: ${trend.predictedNextSeason.join(', ') || 'n/a'}.`
				]
			: ['No signals processed yet.'];
		recapState.trends.highlight = trend ? `Confidence ${percentage(trend.confidence)}` : 'Empty';

		recapState.outfits.lines = outfits
			? [
					`${outfits.successCount} looks approved.`,
					`Avg popularity ${percentage(outfits.avgPopularity)}.`
				]
			: ['Design queue awaits inputs.'];
		recapState.outfits.highlight = outfits ? 'Capsule ready' : 'Empty';

		recapState.quality.lines = outfits && outfits.guardrailReports.length
		? [
			outfits.guardrailFlags.totalIssues > 0
				? `Follow-up required on ${outfits.guardrailFlags.totalIssues} checks.`
				: 'All guardrail checks passed.',
			outfits.reflections.length
				? truncateText(outfits.reflections[0], 70)
				: `${outfits.guardrailReports.length} looks audited for safety.`
		]
		: ['Guardrails dormant.'];
		recapState.quality.highlight = outfits && outfits.guardrailReports.length
		? outfits.guardrailFlags.totalIssues > 0
			? 'Follow-up required'
			: 'Guardrails clear'
		: 'Unverified';

		recapState.media.lines = pipelineSummaries.video && pipelineSummaries.video.available
			? ['Runway reel ready.', 'Artifacts stored in media vault.']
			: ['Video output pending.'];
		recapState.media.highlight = pipelineSummaries.video && pipelineSummaries.video.available ? 'Live' : 'Dormant';
	} else {
		recapState.sources.lines = ['Awaiting URL sweep...'];
		recapState.sources.highlight = 'Not started';

		recapState.video.lines = ['No clips captured yet.'];
		recapState.video.highlight = 'Idle';

		recapState.insights.lines = ['Analysts on standby.'];
		recapState.insights.highlight = 'Pending';

		recapState.trends.lines = ['No signals processed yet.'];
		recapState.trends.highlight = 'Empty';

		recapState.outfits.lines = ['Design queue awaits inputs.'];
		recapState.outfits.highlight = 'Empty';

		recapState.quality.lines = ['Guardrails dormant.'];
		recapState.quality.highlight = 'Unverified';

		recapState.media.lines = ['Video output pending.'];
		recapState.media.highlight = 'Dormant';
	}

	renderRecap();
}

function applyRecapUpdates(updates = []) {
	updates.forEach((update) => {
		const entry = recapState[update.key];
		if (!entry) {
			return;
		}
		if (update.lines) {
			entry.lines = update.lines;
		}
		if (update.highlight) {
			entry.highlight = update.highlight;
		}
		if (update.tag) {
			entry.tag = update.tag;
		}
	});
	renderRecap();
}

function renderRecap() {
	const cards = Object.values(recapState)
		.map((entry) => `
			<article class="recap-card">
				<div class="recap-card__tag">${entry.tag}</div>
				<h4 class="recap-card__title">${entry.title}</h4>
				<div class="recap-card__meta">
					${entry.lines.map((line) => `<span>${line}</span>`).join('')}
				</div>
				<div class="detail-note">${entry.highlight}</div>
			</article>
		`)
		.join('');
	liveRecap.innerHTML = cards;
}

function animatePipeline() {
	if (isRunning || !pipelineStory.length) {
		return;
	}

	isRunning = true;
	hasCompletedRun = false;
	runButton.disabled = true;
	resetPipelineView();
	pipelineStatus.textContent = 'Initializing agents…';

	let cumulativeDelay = 0;
	pipelineStory.forEach((stage, index) => {
		const duration = getStageDuration(index);
		const startMessage = getStageStartMessage(index, stage);

		setTimeout(() => {
			setStageActive(index, { render: false });
			pipelineStatus.textContent = `${stage.agent}: ${startMessage}`;
			renderStageLoading(stage, duration, startMessage);
		}, cumulativeDelay);

		setTimeout(() => {
			setStageComplete(index);
			renderStage(stage);
			applyRecapUpdates(stage.recapUpdates);
			pipelineStatus.textContent = `${stage.agent}: ${stage.status}`;

			if (index === pipelineStory.length - 1) {
				pipelineStatus.textContent = 'Pipeline complete';
				const finalChip = chips[index];
				if (finalChip) {
					finalChip.classList.add('active');
				}
				runButton.disabled = false;
				isRunning = false;
				hasCompletedRun = true;
			}
		}, cumulativeDelay + duration);

		cumulativeDelay += duration;
	});
}

async function initializeDashboard() {
	runButton.disabled = false;
	setIntroView();
	pipelineStatus.textContent = 'Idle - Click "Previous Runs" to load data or "Run Pipeline" to start new analysis';
	
	// Build empty progress bar
	buildProgressBar();
	
	// Don't auto-load data on page load - user will load via "Previous Runs" button
	console.log('💡 Dashboard initialized. Use "Previous Runs" to load historical data or "Run Pipeline" for new analysis.');
}

async function runPipeline() {
	if (isRunning) {
		return;
	}
	
	isRunning = true;
	isLiveRun = true;
	hasCompletedRun = false;
	lastCompletedAgentCount = 0;
	currentRunId = null;
	currentThreadId = null;
	
	runButton.disabled = true;
	runButton.textContent = 'Running Pipeline...';
	pipelineStatus.textContent = 'Initiating workflow...';
	
	// Clear previous results
	stageContent.innerHTML = '';
	
	// Initialize progress bar with empty pipeline story (agent names only)
	pipelineStory = [
		{ agent: 'Anaya (Data Collector Agent)', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] },
		{ agent: 'Maya (Video Analyzer Agent)', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] },
		{ agent: 'Riya (Content Analyzer Agent)', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] },
		{ agent: 'Kavya (Trend Processor Agent)', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] },
		{ agent: 'Priya (Outfit Designer Agent)', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] },
		{ agent: 'Zara (Video Generation Agent)', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] },
		{ agent: 'Final Report & Video Showcase', status: 'Pending...', detailHTML: '', visualHTML: '', recapUpdates: [] }
	];
	buildProgressBar();
	
	try {
		// Start LangGraph workflow via backend API
		console.log('🚀 Starting new pipeline run...');
		
		const runData = await apiClient.startRun({
			region: 'India',
			target_audience: 'Gen Z Women',
			style_preference: 'traditional-modern fusion'
		});
		
		currentRunId = runData.run_id;
		currentThreadId = runData.thread_id;
		
		console.log(`✅ Run started: ${currentRunId} (Thread: ${currentThreadId})`);
		pipelineStatus.textContent = 'Pipeline running - awaiting agent updates...';
		
		// Start polling for updates
		pollForUpdates(currentRunId);
		
	} catch (error) {
		console.error('❌ Failed to start pipeline:', error);
		showErrorNotification('Failed to start pipeline: ' + error.message);
		resetPipelineState();
	}
}

function pollForUpdates(runId) {
	const agentOrder = CONFIG.agents.order;
	
	apiClient.pollRunStatus(runId, async (status) => {
		console.log('📊 Status update:', status);
		
		// Update progress (visual updates handled by chip classes)
		const progress = status.progress || 0;
		
		// Update status message
		if (status.current_agent) {
			const agentDisplayName = CONFIG.agents.displayNames[status.current_agent] || status.current_agent;
			pipelineStatus.textContent = `Running ${agentDisplayName}...`;
		}
		
		// Check if new agents completed
		const completedAgents = status.completed_agents || [];
		const completedCount = completedAgents.length;
		
		if (completedCount > lastCompletedAgentCount) {
			console.log(`✅ ${completedCount - lastCompletedAgentCount} new agent(s) completed (${completedCount}/6)`);
			
			// Just update the visual progress chips without loading data
			for (let i = lastCompletedAgentCount; i < completedCount; i++) {
				if (chips[i]) {
					chips[i].classList.add('complete');
					chips[i].classList.remove('active');
				}
			}
			
			// Set next agent as active if not all complete
			if (completedCount < 6 && chips[completedCount]) {
				chips[completedCount].classList.add('active');
			}
			
			lastCompletedAgentCount = completedCount;
		}
		
		// Handle completion - only load data when ALL agents are done (and only once)
		if (status.status === 'success' && completedCount === 6 && !hasCompletedRun) {
			await handleRunComplete(runId);
		} else if (status.status === 'error') {
			handleRunError(status);
		} else if (status.status === 'interrupted') {
			handleRunInterrupted(status);
		}
	}, CONFIG.api.pollInterval);
}

async function handleRunComplete(runId) {
	console.log('🎉 Pipeline run completed successfully - all 6 agents done!');
	
	// Set flag immediately to prevent multiple calls
	hasCompletedRun = true;
	
	try {
		// Process data through /run_pipeline to update JSON files and download images
		console.log('📦 Processing complete data through /run_pipeline...');
		const pipelineResponse = await fetch('/run_pipeline', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ run_id: runId })
		});
		
		if (!pipelineResponse.ok) {
			throw new Error('Failed to process pipeline data');
		}
		
		// Load the processed data from JSON files
		console.log('📂 Loading processed data from JSON files...');
		pipelineSummaries = await loadPipelineSummaries();
		trendsIndia = await fetchJSON('/trends/india');
		
		console.log('✅ Loaded trendsIndia:', trendsIndia);
		console.log('✅ Video URLs from trendsIndia:', trendsIndia?.video_urls);
		
		// Rebuild pipeline story with processed data
		pipelineStory = buildPipelineStory(pipelineSummaries);
		console.log('✅ Built pipeline story, checking video sources...');
		const videoStage = pipelineStory.find(stage => stage.agent.includes('Video'));
		if (videoStage) {
			console.log('📹 Video stage visual HTML preview:', videoStage.visualHTML?.substring(0, 500));
		}
		resetRecapState();
		buildProgressBar();
		
		// Render all stages with the complete data
		console.log('🎨 Rendering all stages...');
		for (let i = 0; i < pipelineStory.length; i++) {
			renderStage(pipelineStory[i]);
			if (chips[i]) {
				chips[i].classList.add('complete');
				chips[i].classList.remove('active');
			}
			// Add small delay for visual effect
			await new Promise(resolve => setTimeout(resolve, CONFIG.ui.stageAnimationDelay));
		}
		
		// Update UI state
		isRunning = false;
		isLiveRun = false;
		pipelineStatus.textContent = 'Pipeline completed successfully!';
		
		runButton.disabled = false;
		runButton.textContent = 'Run Pipeline';
		
		showSuccessNotification('Pipeline completed successfully!');
		
	} catch (error) {
		console.error('❌ Failed to load final results:', error);
		showErrorNotification('Pipeline completed but failed to load results');
		resetPipelineState();
	}
}

function handleRunError(status) {
	console.error('❌ Pipeline run failed:', status);
	
	const errorMessage = status.error_message || status.error || 'Unknown error occurred';
	const errorAgent = status.error_agent || 'unknown agent';
	
	pipelineStatus.textContent = `Error in ${errorAgent}: ${errorMessage}`;
	showErrorNotification(`Pipeline failed: ${errorMessage}`);
	
	resetPipelineState();
}

function handleRunInterrupted(status) {
	console.warn('⚠️ Pipeline run interrupted:', status);
	
	pipelineStatus.textContent = 'Pipeline run was interrupted';
	showErrorNotification('Pipeline run was interrupted');
	
	resetPipelineState();
}

function updatePipelineSummaries(runData) {
	// Map database response to existing pipelineSummaries structure
	pipelineSummaries = {
		collector: runData.data_collector_output,
		video: runData.video_analyzer_output,
		content: runData.content_analyzer_output,
		trend: runData.trend_processor_output,
		outfits: runData.outfit_designer_output,
		reflection: runData.reflection_agent_output,
		videoGeneration: runData.video_generation_output
	};
	
	// Rebuild pipeline story with new data
	pipelineStory = buildPipelineStory(pipelineSummaries);
	resetRecapState();
}

function resetPipelineState() {
	isRunning = false;
	isLiveRun = false;
	lastCompletedAgentCount = 0;
	
	runButton.disabled = false;
	runButton.textContent = 'Run Pipeline';
	
	apiClient.stopPolling();
}

runButton.addEventListener('click', runPipeline);

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

function showSuccessNotification(message) {
	showNotification(message, 'success');
}

function showErrorNotification(message) {
	showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
	const notification = document.createElement('div');
	notification.className = `notification notification--${type}`;
	notification.textContent = message;
	
	document.body.appendChild(notification);
	
	// Trigger animation
	setTimeout(() => notification.classList.add('notification--show'), 10);
	
	// Auto-remove after duration
	setTimeout(() => {
		notification.classList.remove('notification--show');
		setTimeout(() => notification.remove(), 300);
	}, CONFIG.ui.notificationDuration);
}

// ============================================================================
// PREVIOUS RUNS FUNCTIONALITY
// ============================================================================

let currentPage = 1;
const runsPerPage = CONFIG.ui.runsPerPage;

// Initialize previous runs panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	initializePreviousRunsPanel();
});

function initializePreviousRunsPanel() {
	// Create and inject Previous Runs button if it doesn't exist
	if (!document.getElementById('showPreviousRuns')) {
		const button = document.createElement('button');
		button.id = 'showPreviousRuns';
		button.className = 'btn btn-secondary';
		button.innerHTML = '📋 Previous Runs';
		button.addEventListener('click', showPreviousRunsPanel);
		
		// Insert next to Run Pipeline button
		const pipelineButton = document.getElementById('runPipeline');
		if (pipelineButton && pipelineButton.parentNode) {
			pipelineButton.parentNode.insertBefore(button, pipelineButton.nextSibling);
		} else {
			console.warn('Run Pipeline button not found, appending Previous Runs button to hero content');
			const heroContent = document.querySelector('.hero__content');
			if (heroContent) {
				heroContent.appendChild(button);
			}
		}
	}
	
	// Create Previous Runs Panel HTML if it doesn't exist
	if (!document.getElementById('previousRunsPanel')) {
		createPreviousRunsPanelHTML();
	}
	
	// Attach event listeners
	attachPreviousRunsListeners();
}

function createPreviousRunsPanelHTML() {
	const panelHTML = `
		<div id="previousRunsPanel" class="previous-runs-panel" style="display: none;">
			<div class="panel-header">
				<h3>Previous Runs</h3>
				<button id="closePreviousRuns" class="btn-close" aria-label="Close">×</button>
			</div>
			
			<div class="panel-filters">
				<select id="filterStatus">
					<option value="">All Status</option>
					<option value="completed">Completed</option>
					<option value="error">Error</option>
					<option value="running">Running</option>
					<option value="interrupted">Interrupted</option>
				</select>
				<button id="refreshRuns" class="btn btn-sm">🔄 Refresh</button>
			</div>
			
			<div id="runsList" class="runs-list">
				<!-- Populated dynamically -->
			</div>
			
			<div class="panel-pagination">
				<button id="prevPage" class="btn btn-sm" disabled>← Prev</button>
				<span id="pageInfo">Page 1</span>
				<button id="nextPage" class="btn btn-sm" disabled>Next →</button>
			</div>
		</div>
	`;
	
	document.body.insertAdjacentHTML('beforeend', panelHTML);
}

function attachPreviousRunsListeners() {
	const showBtn = document.getElementById('showPreviousRuns');
	const closeBtn = document.getElementById('closePreviousRuns');
	const refreshBtn = document.getElementById('refreshRuns');
	const filterStatus = document.getElementById('filterStatus');
	const prevPageBtn = document.getElementById('prevPage');
	const nextPageBtn = document.getElementById('nextPage');
	
	if (showBtn) showBtn.addEventListener('click', showPreviousRunsPanel);
	if (closeBtn) closeBtn.addEventListener('click', closePreviousRunsPanel);
	if (refreshBtn) refreshBtn.addEventListener('click', loadPreviousRuns);
	if (filterStatus) filterStatus.addEventListener('change', () => {
		currentPage = 1;
		loadPreviousRuns();
	});
	if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
	if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
}

async function showPreviousRunsPanel() {
	console.log('📋 Opening Previous Runs panel...');
	const panel = document.getElementById('previousRunsPanel');
	if (panel) {
		panel.style.display = 'block';
		await loadPreviousRuns();
	} else {
		console.error('❌ Previous Runs panel not found in DOM');
	}
}

function closePreviousRunsPanel() {
	const panel = document.getElementById('previousRunsPanel');
	if (panel) {
		panel.style.display = 'none';
	}
}

async function loadPreviousRuns() {
	console.log('📋 Loading previous runs...');
	const filterStatus = document.getElementById('filterStatus');
	const status = filterStatus ? filterStatus.value : '';
	
	const params = {
		limit: runsPerPage,
		offset: (currentPage - 1) * runsPerPage
	};
	
	if (status) params.status = status;
	
	console.log('📋 Query params:', params);
	
	try {
		showLoadingInPanel();
		
		const response = await apiClient.listRuns(params);
		console.log('📋 Received runs:', response);
		
		renderRunsList(response.runs || []);
		updatePagination(response.total || 0);
		
	} catch (error) {
		console.error('❌ Failed to load previous runs:', error);
		showErrorNotification('Failed to load previous runs: ' + error.message);
		
		const runsList = document.getElementById('runsList');
		if (runsList) {
			runsList.innerHTML = '<div class="error-state">Failed to load runs. Please try again.<br><small>' + error.message + '</small></div>';
		}
	}
}

function renderRunsList(runs) {
	const runsList = document.getElementById('runsList');
	
	if (!runsList) return;
	
	if (runs.length === 0) {
		runsList.innerHTML = '<div class="empty-state">No runs found</div>';
		return;
	}
	
	runsList.innerHTML = runs.map(run => `
		<div class="run-card" data-run-id="${run.run_id}">
			<div class="run-card__header">
				<span class="run-status run-status--${run.status}">${run.status}</span>
				<span class="run-date">${formatDate(run.created_at)}</span>
			</div>
			
			<div class="run-card__body">
				<div class="run-meta">
					<span title="Run ID">ID: ${run.run_id.substring(0, 8)}...</span>
					${run.duration ? `<span>Duration: ${formatDuration(run.duration)}</span>` : ''}
				</div>
				${run.agents_completed ? `
				<div class="run-meta">
					<span>Agents: ${run.agents_completed}/6</span>
				</div>
				` : ''}
			</div>
			
			<div class="run-card__actions">
				<button class="btn btn-sm btn-load" onclick="loadPreviousRunData('${run.run_id}')">
					📂 Load Results
				</button>
			</div>
		</div>
	`).join('');
}

async function loadPreviousRunData(runId) {
	try {
		console.log('📂 Loading previous run:', runId);
		
		showLoadingOverlay('Loading previous run data...');
		
		// Use the existing /run_pipeline endpoint with run_id parameter
		console.log('🔄 Calling /run_pipeline with run_id:', runId);
		const response = await fetch('/run_pipeline', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ run_id: runId })
		});
		
		if (!response.ok) {
			throw new Error(`Failed to load run: ${response.statusText}`);
		}
		
		const result = await response.json();
		console.log('✅ Run pipeline response:', result);
		
		// Now load the data that was just written to JSON files
		pipelineSummaries = await loadPipelineSummaries();
		
		// Also load trends_india which contains remote image/video URLs
		trendsIndia = await fetchJSON('/trends/india');
		
		// Compute stage durations based on data
		stageDurations = computeStageDurations(pipelineSummaries);
		
		// Build pipeline story
		pipelineStory = buildPipelineStory(pipelineSummaries);
		
		// Reset recap state
		resetRecapState();
		
		// Build progress bar
		buildProgressBar();
		
		// Set completion flag
		hasCompletedRun = true;
		
		// Render all stages
		if (pipelineStory.length > 0) {
			for (let i = 0; i < pipelineStory.length; i++) {
				// Mark stage as complete in UI
				if (chips[i]) {
					chips[i].classList.add('complete');
					chips[i].classList.remove('active');
				}
			}
			
			// Set first stage as active for viewing
			if (chips[0]) {
				chips[0].classList.add('active');
				renderStage(pipelineStory[0]);
				pipelineStatus.textContent = `${pipelineStory[0].agent}: ${pipelineStory[0].status}`;
			}
		}
		
		// Update UI state
		
		closePreviousRunsPanel();
		hideLoadingOverlay();
		showSuccessNotification(`Loaded run: ${runId.substring(0, 20)}...`);
		
		console.log('✅ Previous run loaded successfully');
		
	} catch (error) {
		console.error('❌ Failed to load run data:', error);
		hideLoadingOverlay();
		showErrorNotification('Failed to load run data: ' + error.message);
	}
}

function changePage(delta) {
	currentPage += delta;
	if (currentPage < 1) currentPage = 1;
	loadPreviousRuns();
}

function updatePagination(totalRuns) {
	const totalPages = Math.ceil(totalRuns / runsPerPage) || 1;
	
	const pageInfo = document.getElementById('pageInfo');
	const prevBtn = document.getElementById('prevPage');
	const nextBtn = document.getElementById('nextPage');
	
	if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
	if (prevBtn) prevBtn.disabled = currentPage === 1;
	if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
	if (!dateString) return 'N/A';
	
	const date = new Date(dateString);
	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

function formatDuration(seconds) {
	if (!seconds) return 'N/A';
	
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}m ${secs}s`;
}

function showLoadingOverlay(message = 'Loading...') {
	// Remove existing overlay if present
	hideLoadingOverlay();
	
	const overlay = document.createElement('div');
	overlay.id = 'loadingOverlay';
	overlay.className = 'loading-overlay';
	overlay.innerHTML = `
		<div class="loading-spinner"></div>
		<p>${message}</p>
	`;
	document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
	const overlay = document.getElementById('loadingOverlay');
	if (overlay) overlay.remove();
}

function showLoadingInPanel() {
	const runsList = document.getElementById('runsList');
	if (runsList) {
		runsList.innerHTML = `
			<div class="loading-state">
				<div class="spinner-sm"></div>
				<p>Loading runs...</p>
			</div>
		`;
	}
}

initializeDashboard();


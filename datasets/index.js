const fs = require('fs');
const path = require('path');

function simpleTokenizer(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
}

function chunkText(text, maxChars = 800, overlap = 200) {
	const chunks = [];
	let start = 0;
	while (start < text.length) {
		const end = Math.min(start + maxChars, text.length);
		chunks.push(text.slice(start, end));
		if (end === text.length) break;
		start = end - overlap;
		if (start < 0) start = 0;
	}
	return chunks;
}

function computeTfidfVectors(chunks) {
	const docTermCounts = [];
	const termDocumentFrequency = new Map();

	for (const chunk of chunks) {
		const tokens = simpleTokenizer(chunk);
		const termCount = new Map();
		for (const token of tokens) {
			termCount.set(token, (termCount.get(token) || 0) + 1);
		}
		docTermCounts.push(termCount);
		for (const term of new Set(tokens)) {
			termDocumentFrequency.set(term, (termDocumentFrequency.get(term) || 0) + 1);
		}
	}

	const numDocs = chunks.length;
	const idf = new Map();
	for (const [term, df] of termDocumentFrequency.entries()) {
		idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
	}

	const vectors = [];
	const norms = [];
	for (const termCount of docTermCounts) {
		const vector = new Map();
		let sumSquares = 0;
		for (const [term, count] of termCount.entries()) {
			const tf = 1 + Math.log(count);
			const weight = tf * (idf.get(term) || 0);
			vector.set(term, weight);
			sumSquares += weight * weight;
		}
		vectors.push(vector);
		norms.push(Math.sqrt(sumSquares) || 1);
	}

	return { idf, vectors, norms };
}

function vectorizeQuery(query, idf) {
	const termCount = new Map();
	for (const token of simpleTokenizer(query)) {
		termCount.set(token, (termCount.get(token) || 0) + 1);
	}
	const vector = new Map();
	let sumSquares = 0;
	for (const [term, count] of termCount.entries()) {
		const tf = 1 + Math.log(count);
		const weight = tf * (idf.get(term) || 0);
		if (weight > 0) {
			vector.set(term, weight);
			sumSquares += weight * weight;
		}
	}
	const norm = Math.sqrt(sumSquares) || 1;
	return { vector, norm };
}

function cosineSimilarity(a, b, normA, normB) {
	let dot = 0;
	for (const [term, weightA] of a.entries()) {
		const weightB = b.get(term);
		if (weightB) dot += weightA * weightB;
	}
	return dot / (normA * normB);
}

function listFilesRecursive(dir) {
	const out = [];
	const stack = [dir];
	while (stack.length) {
		const current = stack.pop();
		if (!fs.existsSync(current)) continue;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
			} else if (/\.(txt|md|json)$/i.test(entry.name)) {
				out.push(full);
			}
		}
	}
	return out;
}

class DatasetIndex {
	constructor(rootDir) {
		this.rootDir = rootDir;
		this.files = [];
		this.chunks = [];
		this.meta = [];
		this.idf = new Map();
		this.vectors = [];
		this.norms = [];
	}

	load() {
		const dir = this.rootDir;
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// collect dataset files recursively
		this.files = listFilesRecursive(dir);

		// include root README.md if exists
		const rootReadme = path.join(path.dirname(this.rootDir), 'README.md');
		if (fs.existsSync(rootReadme)) {
			this.files.push(rootReadme);
		}

		this.chunks = [];
		this.meta = [];

		for (const full of this.files) {
			let raw = fs.readFileSync(full, 'utf8');
			const file = path.relative(dir, full);
			if (/\.json$/i.test(full)) {
				try {
					const json = JSON.parse(raw);
					raw = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
				} catch {
					// keep as raw text if JSON parse fails
				}
			}
			const fileChunks = chunkText(raw, 1000, 200);
			for (const chunk of fileChunks) {
				this.chunks.push(chunk);
				this.meta.push({ file, length: chunk.length });
			}
		}

		const { idf, vectors, norms } = computeTfidfVectors(this.chunks);
		this.idf = idf;
		this.vectors = vectors;
		this.norms = norms;
	}

	search(query, topK = 4) {
		if (this.chunks.length === 0) return [];
		const { vector, norm } = vectorizeQuery(query, this.idf);
		const scored = this.vectors.map((vec, i) => ({
			index: i,
			score: cosineSimilarity(vector, vec, norm, this.norms[i])
		}));
		scored.sort((a, b) => b.score - a.score);
		const results = [];
		for (let i = 0; i < Math.min(topK, scored.length); i++) {
			const s = scored[i];
			if (s.score <= 0) break;
			results.push({
				text: this.chunks[s.index],
				score: s.score,
				meta: this.meta[s.index]
			});
		}
		return results;
	}

	stats() {
		return {
			files: this.files.map(f => path.relative(this.rootDir, f)),
			numFiles: this.files.length,
			numChunks: this.chunks.length,
			vocabularySize: this.idf.size
		};
	}
}

module.exports = { DatasetIndex };

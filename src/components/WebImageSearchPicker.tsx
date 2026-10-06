import React, { useState } from 'react';
import { Search, Check, Loader2, X, ExternalLink } from 'lucide-react';

export interface WebImageResult {
  id: string;
  title: string;
  thumbUrl: string;
  imageUrl: string;
  source: string;
}

interface WebImageSearchPickerProps {
  currentImageUrl?: string;
  defaultQuery?: string;
  onSelectImageUrl: (url: string) => void;
  buttonLabel?: string;
}

async function searchWikimediaImages(query: string): Promise<WebImageResult[]> {
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    `${query} filetype:bitmap`
  )}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|dimensions&iiurlwidth=800&format=json&origin=*`;

  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];

  const results: WebImageResult[] = [];
  for (const rawPage of pages as Array<{
    pageid?: number;
    title?: string;
    imageinfo?: Array<{
      thumburl?: string;
      url?: string;
    }>;
  }>) {
    const info = rawPage?.imageinfo?.[0];
    const url = info?.thumburl || info?.url || '';
    if (!url) continue;
    const lower = url.toLowerCase();
    if (
      lower.endsWith('.svg') ||
      lower.endsWith('.pdf') ||
      lower.endsWith('.djvu') ||
      lower.endsWith('.ogv') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.tif') ||
      lower.endsWith('.tiff')
    ) {
      continue;
    }
    const cleanTitle = (rawPage.title || 'Image')
      .replace(/^File:/i, '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/_/g, ' ');

    results.push({
      id: `wiki-${rawPage.pageid || url}`,
      title: cleanTitle,
      thumbUrl: url,
      imageUrl: url,
      source: 'Wikimedia',
    });
  }
  return results;
}

async function searchOpenverseImages(query: string): Promise<WebImageResult[]> {
  const endpoint = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
    query
  )}&page_size=12`;

  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data?.results) ? data.results : [];

  const results: WebImageResult[] = [];
  for (const item of items as Array<{
    id?: string;
    title?: string;
    thumbnail?: string;
    url?: string;
    source?: string;
  }>) {
    const fullUrl = item.url || item.thumbnail || '';
    const thumb = item.thumbnail || item.url || '';
    if (!fullUrl || !thumb) continue;
    results.push({
      id: `ov-${item.id || fullUrl}`,
      title: item.title || 'Web Image',
      thumbUrl: thumb,
      imageUrl: fullUrl,
      source: item.source || 'Web',
    });
  }
  return results;
}

export async function searchTopSixWebImages(
  rawQuery: string
): Promise<WebImageResult[]> {
  const q = rawQuery.trim();
  if (!q) return [];

  const [openverseSettled, wikiSettled] = await Promise.allSettled([
    searchOpenverseImages(q),
    searchWikimediaImages(q),
  ]);

  const openverseList =
    openverseSettled.status === 'fulfilled' ? openverseSettled.value : [];
  const wikiList =
    wikiSettled.status === 'fulfilled' ? wikiSettled.value : [];

  // Interleave results from both sources and deduplicate by URL, keeping the top 6
  const combined: WebImageResult[] = [];
  const seenUrls = new Set<string>();
  const maxLen = Math.max(openverseList.length, wikiList.length);

  for (let i = 0; i < maxLen && combined.length < 6; i++) {
    if (i < openverseList.length && combined.length < 6) {
      const candidate = openverseList[i];
      if (!seenUrls.has(candidate.imageUrl)) {
        seenUrls.add(candidate.imageUrl);
        combined.push(candidate);
      }
    }
    if (i < wikiList.length && combined.length < 6) {
      const candidate = wikiList[i];
      if (!seenUrls.has(candidate.imageUrl)) {
        seenUrls.add(candidate.imageUrl);
        combined.push(candidate);
      }
    }
  }

  return combined.slice(0, 6);
}

export const WebImageSearchPicker: React.FC<WebImageSearchPickerProps> = ({
  currentImageUrl = '',
  defaultQuery = '',
  onSelectImageUrl,
  buttonLabel = 'Image Search',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<WebImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runSearch = async (queryToRun: string) => {
    const clean = queryToRun.trim();
    if (!clean) return;
    setIsSearching(true);
    setHasSearched(true);
    setErrorMsg(null);
    try {
      const topSix = await searchTopSixWebImages(clean);
      setResults(topSix);
    } catch {
      setErrorMsg('Unable to fetch image results right now. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !searchQuery.trim() && defaultQuery.trim()) {
      const initial = defaultQuery.split('//')[0].trim();
      setSearchQuery(initial);
      if (results.length === 0) {
        void runSearch(initial);
      }
    }
  };

  return (
    <div className={isOpen ? 'w-full' : 'inline-block'}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono-tabular transition-colors cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-[#16A34A] border-[#16A34A] text-white font-semibold'
            : 'bg-[#0B0E0D] hover:bg-[#19201E] border-[#232B28] hover:border-[#16A34A] text-[#4ADE80]'
        }`}
      >
        <Search size={13} />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="mt-2 w-full bg-[#0B0E0D] border-2 border-[#16A34A] rounded p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-tabular text-[11px] font-semibold text-[#4ADE80] uppercase">
              QUICK WEB IMAGE SEARCH (TOP 6 RESULTS)
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] text-[11px] font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
            >
              <X size={11} />
              <span>Close Search</span>
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch(searchQuery);
                }
              }}
              placeholder="Type what you want to find (e.g., detective portrait, abandoned cabin, ritual dagger)..."
              className="flex-1 bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
            />
            <button
              type="button"
              disabled={isSearching || !searchQuery.trim()}
              onClick={() => void runSearch(searchQuery)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-mono-tabular font-semibold cursor-pointer shrink-0"
            >
              {isSearching ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Search size={13} />
              )}
              <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="text-xs font-mono-tabular text-[#F87171]">
              {errorMsg}
            </div>
          )}

          {isSearching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded bg-[#121715] border border-[#232B28] animate-pulse"
                />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-mono-tabular text-[#8C9692]">
                Click any of the top 6 results below to use its image URL:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {results.map((item) => {
                  const isSelected = currentImageUrl === item.imageUrl;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectImageUrl(item.imageUrl)}
                      title={`Use "${item.title}"`}
                      className={`group relative h-28 rounded overflow-hidden border-2 text-left transition-all cursor-pointer bg-[#121715] ${
                        isSelected
                          ? 'border-[#16A34A] ring-2 ring-[#16A34A]/40'
                          : 'border-[#232B28] hover:border-[#4ADE80]'
                      }`}
                    >
                      <img
                        src={item.thumbUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-[#0B0E0D]/85 border-t border-[#232B28] px-2 py-1 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono-tabular text-[#E2E6E4] truncate">
                          {item.title}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#16A34A] text-white text-[9px] font-mono-tabular font-bold shrink-0">
                            <Check size={10} />
                            <span>USED</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="text-xs font-mono-tabular text-[#8C9692] py-2">
              No direct images found for &ldquo;{searchQuery}&rdquo;. Try simpler keywords (e.g., &ldquo;warehouse&rdquo;, &ldquo;agent&rdquo;, &ldquo;forest&rdquo;, &ldquo;microscope&rdquo;).
            </div>
          ) : null}

          {searchQuery.trim() && (
            <div className="pt-1 border-t border-[#232B28] flex items-center justify-between text-[11px] font-mono-tabular text-[#8C9692]">
              <span>Selecting an image automatically fills the Image URL field</span>
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
                  searchQuery.trim()
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#4ADE80] hover:underline"
              >
                <span>Open Google Images</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

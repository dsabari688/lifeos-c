// Piggy AI v4.0 — Memory Vault Filtering Module

export interface AIMemoryFact {
  id: string;
  fact: string;
  category: 'deadline' | 'exam' | 'preference' | 'constraint' | 'goal';
  timestamp: string;
}

/**
 * Filters the list of stored memories to return only the most contextually relevant 
 * facts for the user's current input, optimizing token usage.
 */
export function retrieveRelevantMemories(query: string, memories: AIMemoryFact[]): AIMemoryFact[] {
  if (!memories || memories.length === 0) return [];
  const normalizedQuery = query.toLowerCase();

  // Category search keywords
  const categoryKeywords: Record<string, string[]> = {
    exam: ["exam", "study", "college", "test", "quiz", "class", "final", "semester", "preparation", "midterm"],
    deadline: ["deadline", "due", "submit", "flight", "trip", "travel", "date", "calendar", "schedule", "tomorrow", "upcoming"],
    preference: ["prefer", "like", "love", "favorite", "usually", "custom", "want", "study slot", "focus session", "hours", "duration"],
    constraint: ["skip", "cannot", "can't", "don't", "never", "only", "days", "sunday", "saturday", "weekend", "morning", "evening"],
    goal: ["goal", "target", "aim", "achieve", "objective", "plan", "milestone", "pacing"]
  };

  // 1. Identify query-matched categories
  const matchedCategories = new Set<string>();
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => normalizedQuery.includes(keyword))) {
      matchedCategories.add(category);
    }
  });

  // 2. Score facts by keyword relevance and category matching
  const scored = memories.map(m => {
    let score = 0;
    
    // Category match bonus
    if (matchedCategories.has(m.category)) {
      score += 4;
    }

    // Keyword overlaps
    const queryWords = normalizedQuery.split(/\W+/).filter(w => w.length > 3);
    const factWords = m.fact.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    queryWords.forEach(qw => {
      if (factWords.some(fw => fw.includes(qw) || qw.includes(fw))) {
        score += 3;
      }
    });

    return { fact: m, score };
  });

  // 3. Filter matched facts. If nothing scored, fall back to returning a general baseline of 4 facts
  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.fact);
  if (matched.length > 0) {
    return matched.slice(0, 5); // Return up to top 5 relevant memories
  }

  // General baseline default context
  return memories.slice(0, 4);
}

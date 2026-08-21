/** Article version objects that can hold content. Not expert-user, stats, or containers. */
export function isArticleSource(apiName: string) {
  if (
    /(User|ViewStat|VoteStat|History|Feed|Share|ChangeEvent)$/i.test(apiName) ||
    /^(KnowledgeArticle|KnowledgeArticleVersion)$/i.test(apiName)
  ) {
    return false;
  }

  return /(__kav|_kav)$/i.test(apiName);
}

export function isArticleCountObject(apiName: string) {
  return isArticleSource(apiName) || /^KnowledgeArticleVersion$/i.test(apiName);
}

export function articleSources(apiNames: string[] | null | undefined) {
  return (apiNames ?? []).filter(isArticleSource);
}

export function articleCountTargets(apiNames: string[] | null | undefined) {
  const types = articleSources(apiNames);
  if (types.length > 0) {
    return types;
  }

  return (apiNames ?? []).filter((name) => /^KnowledgeArticleVersion$/i.test(name));
}

export type ArticleCounts = {
  draft: number;
  published: number;
  archived: number;
};

export type ArticleContentState = "published" | "unpublished" | "empty" | "unknown";

export function formatArticleCounts(counts: ArticleCounts) {
  return `Published articles: ${counts.published}. Draft: ${counts.draft}. Archived: ${counts.archived}.`;
}

export function articleContentState(input: {
  articleCountsKnown?: boolean;
  articles?: ArticleCounts | null;
}): ArticleContentState {
  if (!input.articleCountsKnown || !input.articles) {
    return "unknown";
  }

  if (input.articles.published > 0) {
    return "published";
  }

  if (input.articles.draft + input.articles.archived > 0) {
    return "unpublished";
  }

  return "empty";
}

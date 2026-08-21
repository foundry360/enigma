import { describe, expect, it } from "vitest";
import {
  articleContentState,
  articleCountTargets,
  articleSources,
  formatArticleCounts,
  isArticleCountObject,
  isArticleSource,
} from "@/modules/enterprise/knowledge-sources";

describe("article sources", () => {
  it("counts knowledge article types that can hold content", () => {
    expect(isArticleSource("Knowledge__kav")).toBe(true);
    expect(isArticleSource("FAQ__kav")).toBe(true);
    expect(isArticleCountObject("Knowledge__kav")).toBe(true);
    expect(isArticleCountObject("KnowledgeArticleVersion")).toBe(true);
  });

  it("rejects platform containers and expert-user objects as a knowledge base", () => {
    expect(isArticleSource("KnowledgeArticle")).toBe(false);
    expect(isArticleSource("KnowledgeArticleVersion")).toBe(false);
    expect(isArticleSource("KnowledgeableUser")).toBe(false);
    expect(isArticleSource("KnowledgeArticleViewStat")).toBe(false);
    expect(isArticleSource("KnowledgeArticleVoteStat")).toBe(false);
    expect(
      articleSources([
        "KnowledgeableUser",
        "KnowledgeArticle",
        "KnowledgeArticleVersion",
        "KnowledgeArticleViewStat",
        "Knowledge__kav",
      ]),
    ).toEqual(["Knowledge__kav"]);
    expect(
      articleCountTargets([
        "KnowledgeableUser",
        "KnowledgeArticleVersion",
        "Knowledge__kav",
      ]),
    ).toEqual(["Knowledge__kav"]);
    expect(articleCountTargets(["KnowledgeableUser", "KnowledgeArticleVersion"])).toEqual(
      ["KnowledgeArticleVersion"],
    );
  });

  it("judges content from article counts, not object types", () => {
    expect(
      articleContentState({
        articleCountsKnown: true,
        articles: { draft: 0, published: 0, archived: 0 },
      }),
    ).toBe("empty");
    expect(
      articleContentState({
        articleCountsKnown: true,
        articles: { draft: 3, published: 0, archived: 1 },
      }),
    ).toBe("unpublished");
    expect(
      articleContentState({
        articleCountsKnown: true,
        articles: { draft: 0, published: 12, archived: 0 },
      }),
    ).toBe("published");
    expect(articleContentState({ articleCountsKnown: false })).toBe("unknown");
    expect(
      formatArticleCounts({ draft: 2, published: 0, archived: 1 }),
    ).toBe("Published articles: 0. Draft: 2. Archived: 1.");
  });
});

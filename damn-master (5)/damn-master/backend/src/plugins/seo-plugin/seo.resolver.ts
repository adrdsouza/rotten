import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission } from '@vendure/core';
import { SeoService } from './seo.service.js';
import { gql } from 'graphql-tag';

// GraphQL schema definitions
const seoAdminApiExtensions = gql`
  extend type Query {
    generateSitemapPreview(type: String!): String!
    getOrganizationSchema: String!
    getWebsiteSchema: String!
  }

  extend type Mutation {
    refreshSitemaps: SitemapRefreshResult!
  }

  type SitemapRefreshResult {
    success: Boolean!
    message: String!
  }
`;

export { seoAdminApiExtensions };

@Resolver()
export class SeoResolver {
  constructor(private seoService: SeoService) {}

  @Query()
  @Allow(Permission.ReadCatalog)
  async generateSitemapPreview(@Ctx() ctx: RequestContext, @Args('type') type: string) {
    switch (type) {
      case 'products':
        return await this.seoService.generateProductSitemap(ctx);
      case 'collections':
        return await this.seoService.generateCollectionSitemap(ctx);
      case 'main':
        return await this.seoService.generateMainSitemap();
      case 'index':
        return await this.seoService.generateSitemapIndex();
      default:
        throw new Error(`Unknown sitemap type: ${type}`);
    }
  }

  @Query()
  @Allow(Permission.ReadCatalog)
  async getOrganizationSchema() {
    return this.seoService.generateOrganizationJsonLd();
  }

  @Query()
  @Allow(Permission.ReadCatalog)
  async getWebsiteSchema() {
    return this.seoService.generateWebsiteJsonLd();
  }

  @Mutation()
  @Allow(Permission.UpdateCatalog)
  async refreshSitemaps(@Ctx() _ctx: RequestContext) {
    // This could trigger a background job to regenerate all sitemaps
    // For now, we'll just return a success message
    return {
      success: true,
      message: 'Sitemaps will be regenerated on next request'
    };
  }
}
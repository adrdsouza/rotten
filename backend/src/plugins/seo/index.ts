import { PluginCommonModule, VendurePlugin, Type } from '@vendure/core';
import { SeoService } from './seo.service';
import { SeoResolver, seoAdminApiExtensions } from './seo.resolver';
import { SeoController } from './seo.controller';

export interface SeoPluginOptions {
  siteDomain: string;
  companyName: string;
  companyDescription: string;
  contactEmail: string;
  socialMediaUrls?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  localBusiness?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    hours: string;
  };
}

@VendurePlugin({
  compatibility: '^3.0.0',
  imports: [PluginCommonModule],
  providers: [
    SeoService,
    {
      provide: 'SEO_PLUGIN_OPTIONS',
      useFactory: () => SeoPlugin.options,
    },
  ],
  adminApiExtensions: {
    schema: seoAdminApiExtensions,
    resolvers: [SeoResolver],
  },
  controllers: [SeoController],
  configuration: config => {
    return config;
  },
})
export class SeoPlugin {
  static options: SeoPluginOptions;

  static init(options: SeoPluginOptions): Type<SeoPlugin> {
    this.options = options;
    return SeoPlugin;
  }
}

export { SeoService } from './seo.service';
export { SeoResolver } from './seo.resolver';
export { SeoController } from './seo.controller';
export * from './types';
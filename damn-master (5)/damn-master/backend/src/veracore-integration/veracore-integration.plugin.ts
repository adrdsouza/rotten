import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { VERACORE_INTEGRATION_PLUGIN_OPTIONS } from './constants.js';
import { PluginInitOptions } from './types.js';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: VERACORE_INTEGRATION_PLUGIN_OPTIONS, useFactory: () => VeracoreIntegrationPlugin.options }],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
})
export class VeracoreIntegrationPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<VeracoreIntegrationPlugin> {
        this.options = options;
        return VeracoreIntegrationPlugin;
    }
}

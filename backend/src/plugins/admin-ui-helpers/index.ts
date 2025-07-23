import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import path from 'path';

@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        // Add any custom configuration here if needed
        return config;
    },
})
export class AdminUiHelpersPlugin {
    static uiExtensions: AdminUiExtension = {
        extensionPath: path.join(__dirname, 'ui'),
        ngModules: [
            {
                type: 'lazy',
                route: 'custom-actions',
                ngModuleFileName: 'admin-ui-helpers.module.ts',
                ngModuleName: 'AdminUiHelpersModule',
            },
            {
                type: 'shared',
                ngModuleFileName: 'admin-ui-helpers-shared.module.ts',
                ngModuleName: 'AdminUiHelpersSharedModule',
            },
        ],
    };
}

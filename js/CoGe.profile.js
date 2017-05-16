function copyOnly(mid) {
    return mid in {
        // There are no modules right now that are copy-only. If you have some, though, just add
        // them here like this:
        // 'app/module': 1
    };
}

var profile = {
    action: 'release',
    cssOptimize: 'comments',
    mini: true,

    basePath: '../../../src',
    packages: [
        {name: 'CoGe', location: '../plugins/CoGe/js' }
    ],

    layerOptimize: 'closure',
    stripConsole: 'normal',
    selectorEngine: 'acme',

    layers: {
        'CoGe/main': {
            include: [
                'CoGe',
                'CoGe/Store/SeqFeature/Search',
                'CoGe/View/ColorDialog',
                'CoGe/View/Track/CoGeAlignment',
                'CoGe/View/Track/CoGeFeatures',
                'CoGe/View/Track/CoGeVariants',
                'CoGe/View/Track/GC_Content',
                'CoGe/View/Track/Markers',
                'CoGe/View/Track/Wiggle/Density',
                'CoGe/View/Track/Wiggle/XYPlot',
                'CoGe/View/Track/Wiggle/_Scale',
                'CoGe/View/TrackList/CoGe'
            ],
            exclude: [ 'JBrowse' ]
        }
    },

    staticHasFeatures: {
        'dojo-trace-api':0,
        'dojo-log-api':0,
        'dojo-publish-privates':0,
        'dojo-sync-loader':0,
        'dojo-xhr-factory':0,
        'dojo-test-sniff':0
    },

    resourceTags: {
        // Files that contain test code.
        test: function (filename, mid) {
            return false;
        },

        // Files that should be copied as-is without being modified by the build system.
        copyOnly: function (filename, mid) {
            return copyOnly(mid);
        },

        // Files that are AMD modules.
        amd: function (filename, mid) {
            return !copyOnly(mid) && /.js$/.test(filename);
        },

        // Files that should not be copied when the “mini” compiler flag is set to true.
        miniExclude: function (filename, mid) {
            return ! ( /^CoGe/.test(mid) );
        }
    }
};

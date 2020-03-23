
var coge_markers;
define([
    'dojo/_base/declare',
    'dijit/Dialog',
    'CoGe/View/ColorDialog',
    'JBrowse/View/Track/HTMLFeatures'
],
function(declare, Dialog, ColorDialog, HTMLFeatures) {
    return declare( [ HTMLFeatures ], {
    constructor: function() {
        this.inherited(arguments); // call superclass constructor
        coge_markers = this;
        this.browser = arguments[0].browser;
    },

    // ----------------------------------------------------------------

    _trackMenuOptions: function() {
        var options = this.inherited(arguments);
        var track = this;
        var config = track.config;

        if (config.coge.type == 'notebook')
            return options;

        options.push({ type: 'dijit/MenuSeparator' });

		if (config.coge.type == 'experiment')
			options.push({
				label: 'ExperimentView',
				onClick: function(){window.open( 'ExperimentView.pl?eid=' + config.coge.id );}
            });

		options.push({
            label: 'Change color',
            onClick: function(event) {
                if (!track._color_dialog) {
					var feature_color = {};
					if (config.style.featureCss)
						feature_color[config.coge.id] = config.style.featureCss.substring(17);
                    track._color_dialog = new ColorDialog({
                        title: "Change colors",
                        style: { width: '230px' },
                        track: track,
                        items: config.coge.experiments || [{value: config.coge.id, label: config.coge.name}],
                        featureColor: feature_color,
                        callback: function(id, color) {
                            var curColor = config.style.featureCss;
                            if (!curColor || curColor.substring(curColor.indexOf(':') + 1).toLowerCase() != color.toLowerCase()) {
                                config.style.featureCss = 'background-color:' + color;
								track.updateUserStyles({ featureCss : config.style.featureCss });
                                track.changed();
                                coge_track_list.setTrackColor(config.track, id, color);
                            }
                        }
                    });
                }
                track._color_dialog.show();
            }
        });

        if (config.coge.type != 'search')  {
            options.push({
                label: 'Find Data that Overlaps Features',
                onClick: function(){coge_plugin.features_overlap_search_dialog(track, 'Markers', 'markers');}
            });
        }
        options.push({
            label: 'Export Track Data',
            onClick: function(){coge_plugin.export_dialog(track);}
        });
        if (config.coge.search)
            options.push({
                label: 'Merge Markers',
                onClick: function(){coge_plugin.markers_merge_dialog(track)}
            });
            options.push({
                label: 'Save Results as New Experiment',
                onClick: function(){coge_plugin.save_as_experiment_dialog(track)}
            });
        return options;
    },

    // ----------------------------------------------------------------

    updateStaticElements: function( coords ) {
        this.inherited( arguments );
        coge_plugin.adjust_nav(this.config.coge.id)
    }
});
});

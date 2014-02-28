define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/promise/all',
            'JBrowse/Util',
            'JBrowse/View/Track/Alignments2',
            'CoGe/View/ColorDialog'
        ],
        function(
            declare,
            array,
            lang,
            all,
            Util,
            Alignment2Track,
            ColorDialog
        ) {

    return declare( [ Alignment2Track ], {
        //FIXME The track color should be fetched from the browser
        constructor: function (args) {
            this.inherited(arguments);
            var id = this.config.coge.id;
            var cookie = this.browser.cookie('track-' + this.name);

            if (!this.config.style.featureColor) {
                this.config.style.featureColor = {};
            }

            if (cookie) {
                this.config.style = lang.mixin(this.config.style, dojo.fromJson(cookie));
                this.config.histograms.color = this.config.style.featureColor[id];
            }

            if(!this.config.style.featureColor[id]) {
                this.config.style.featureColor[id] = this._getFeatureColor(id);
                this.config.histograms.color = this.config.style.featureColor[id];
            }
        },

        _getFeatureColor: function(id) {
            if (this.config.style.featureColor && this.config.style.featureColor[id]) {
                return this.config.style.featureColor[id];
            }
            return '#' + ((((id * 1234321) % 0x1000000) | 0x444444) & 0xe7e7e7 ).toString(16); //FIXME: dup'ed in CoGe.js
        },

        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var track = this;
            var config = this.config;

            return opts.then(function(options) {
                options.push.apply(options, [
                    { type: 'dijit/MenuSeparator' },
                    {
                    label: 'Change colors',
                    onClick: function(event) {
                        if (!track.colorDialog) {
                            track.colorDialog = new ColorDialog({
                                title: "Change colors",
                                style: {
                                    width: '230px',
                            },
                            items: [track.config.coge],
                            featureColor: track.config.style.featureColor,
                            callback: function(id, color) {
                                var curColor = track.config.style.featureColor[id];
                                if (!curColor || curColor != color) {
                                    track.config.style.featureColor[id] = color;

                                    // Save color choice
                                    track.config.histograms.color = color;

                                    // Use cookie to persist color choice - mdb added 1/13/14, issue 279
                                    var cookieName = 'track-' + track.name;
                                    track.browser.cookie(cookieName, config.style);

                                    // Repaint track
                                    track.changed();

                                    //FIXME TrackList should update itself
                                    track.browser.publish('/jbrowse/v1/c/tracks/show', [track.config]);
                                }
                            }
                        });
                    }
                    track.colorDialog.show();
                }
            }]);

            return options;
        });
    },
})
});

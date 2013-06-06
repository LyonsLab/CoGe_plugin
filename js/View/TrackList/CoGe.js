define(['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/dom-construct',
        'dojo/dom-geometry',
        'dojo/aspect',
        'dijit/layout/ContentPane',
        'dojo/dnd/Source',
        'dojo/fx/easing',
        'dijit/form/TextBox',
        'dojo/mouse'
       ],
       function( declare, array, dom, domGeom, aspect, ContentPane, dndSource, animationEasing, dijitTextBox, mouse ) {
return declare( 'JBrowse.View.TrackList.CoGe', null,

    /** @lends JBrowse.View.TrackList.CoGe.prototype */
    {
    /**
     * CoGe drag-and-drop track selector.
     * @constructs
     */
    constructor: function( args ) {
        this.browser = args.browser;

        // make the track list DOM nodes and widgets
        this.createTrackList( args.browser.container, args.trackConfigs );

        // maintain a list of the HTML nodes of filtered tracks
        this.filteredNodes = {};
        
        // maximum tracks that can be added via "+" button
        this.maxTracksToAdd = 20;
        
        // subscribe to drop events for tracks being DND'ed
        this.browser.subscribe( '/dnd/drop', 
        						dojo.hitch( this, 'moveTracks' ));

        // subscribe to commands coming from the the controller
        this.browser.subscribe( '/jbrowse/v1/c/tracks/show',
                                dojo.hitch( this, 'setTracksActive' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/hide',
                                dojo.hitch( this, 'setTracksInactive' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/new',
                                dojo.hitch( this, 'addTracks' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/replace',
                                dojo.hitch( this, 'replaceTracks' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/delete',
                                dojo.hitch( this, 'deleteTracks' ));
    },
    
    moveTracks: function( source, nodes, copy, target ) {
    	if ( source == target) { // both source and target
    		console.log('source = target');
    		return;
    	}
    	
    	var isSource = this.trackListWidgets.indexOf(source) != -1;
    	var isTarget = this.trackListWidgets.indexOf(target) != -1;
    	
    	if( isSource && !isTarget ) { // source
        	console.log('/dnd/drop/source');
        	// get the configs from the tracks being dragged in
            var confs = dojo.filter(
                dojo.map( nodes, function(n) {
                              return source.map[n.id].data;
                        }),
                function(c) {return c;}
            );
        	
            // highlight track to show it is enabled
            this.dndDrop = true;
            this.browser.publish( '/jbrowse/v1/v/tracks/show', confs ); // mdb: why not just call setTrackActive directly?
            this.dndDrop = false;
        }
    	
        if( this.trackListWidgets.indexOf(target) != -1 ) { // target
        	console.log('/dnd/drop/target');
        	
            // get the configs from the tracks being dragged in
            var confs = dojo.filter(
                dojo.map( nodes, function(n) {
                              return n.track && n.track.config;
                        }),
                function(c) {return c;}
            );
            
            // return if no confs; whatever was dragged here probably wasn't a track from browser
            if( confs.length ) {
                // un-highlight track to show it is disabled
                this.dndDrop = true;
                this.browser.publish( '/jbrowse/v1/v/tracks/hide', confs ); // mdb: why not just call setTrackInactive directly?
                this.dndDrop = false;
            }
            else { // dragged-in from track selector
            	var notebookName;
            	var notebookId;
            	target.getAllNodes().forEach( function(node) { // FIXME: kludge
            		dojo.query('.coge-notebook', node).forEach( function(n) {
            			notebookName = n.id;
            			notebookId = notebookName.match(/\d+/);
            		});
            	});
            	
            	if (notebookId) { // target is notebook
            		// Add experiment to notebook
            		nodes.forEach( dojo.hitch(this, function(node) {
            			var nodeId;
            			dojo.query('.coge-experiment', node).forEach( function(n) {
                			nodeId = n.id;
                		});
            			console.log('nodeId='+nodeId);
            			var conf = this.browser.trackConfigsByName[nodeId];
            			if (conf) {
            				dojo.xhrPut({
	      					    url: "NotebookView.pl",
	    					    putData: {
	    					    	fname: 'add_item_to_list',
	    					    	lid: notebookId,
	    					    	item_spec: '3:'+conf.coge.id, // FIXME: hardcoded type to experiment
	    					    },
	    					    handleAs: "json",
	    					    load: dojo.hitch(this, function(data) {
	    					    	// Reload track in browser
	    		                	this.browser.view.tracks.forEach( function(track) {
	    		                		if (track.config.label == notebookName) {
	    		                			track.changed();
	    		                		}
	    		                	});
	    					    })
						    });
            			}
            		}));

            		// Indent node in track list
                	target.getAllNodes().forEach( function(node) { // FIXME: kludge
                		dojo.query('.coge-tracklist-label.coge-experiment', node)
                			.addClass('notebook-indent');
                	});
            	}
            }
		}
    },

    addTracks: function( trackConfigs ) { // mdb: unused now
    	console.log('addTracks');
//        // note that new tracks are, by default, hidden, so we just put them in the list
//        this.trackListWidget.insertNodes(
//            false,
//            trackConfigs
//        );
//
//        this._blinkTracks( trackConfigs );
    },

    replaceTracks: function( trackConfigs ) { // mdb: unused now
    	console.log('replaceTracks');
//        // for each one
//        array.forEach( trackConfigs, function( conf ) {
//            // figure out its position in the genome view and delete it
//            var oldNode = this.inactiveTrackNodes[ conf.label ];
//            if( ! oldNode )
//                return;
//            delete this.inactiveTrackNodes[ conf.label ];
//
//            this.trackListWidget.delItem( oldNode.id );
//            if( oldNode.parentNode )
//                oldNode.parentNode.removeChild( oldNode );
//
//           // insert the new track config into the trackListWidget after the 'before'
//           this.trackListWidget.insertNodes( false, [conf], false, oldNode.previousSibling );
//       },this);
    },

    /** @private */
    createTrackList: function( renderTo, trackConfigs ) {
        var trackPane = this.pane = dojo.create(
            'div',
            { id: 'trackPane',
              style: { width: '215px' } // 'min-width': '200px' -- mdb: messes up resize
            },
            renderTo
        );

        // splitter on right side
        var trackWidget = new ContentPane({region: "right", splitter: true}, trackPane);

        this.div = dojo.create(
            'div',
            { id: 'tracksAvail',
              className: 'container handles',
              style: { width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' },
              //innerHTML: '<h2>Available Tracks</h2>',
              //onclick: dojo.hitch( this, function() { this.trackListWidget.selectNone(); } )
            },
            trackPane
        );

        // create text filter input
        this._createTextFilter(trackConfigs);
        this._updateTextFilterControl();

        // create a DnD source for sequence, annotation, etc.
        this.trackListWidgets = [];
        
        var temp = this._createDnDSource();
        temp.insertNodes(
            	false,
            	trackConfigs.filter( function(e) {
            		return ( !e.coge.type ||
            				 (e.coge.type == 'sequence' || e.coge.type == 'annotation') );
            	})
            );
        this.trackListWidgets.push( temp );
        
        // create a DnD source for each notebook
        var notebooks = trackConfigs.filter( function(e) {
    		return (e.coge.type && e.coge.type == 'notebook');
    	});
    	var experiments = trackConfigs.filter( function(e) {
    		return (e.coge.type && e.coge.type == 'experiment');
    	});
    	var that = this;
        notebooks.forEach( function(n) {
    		temp = that._createDnDSource();
    		temp.insertNodes(
                	false,
                	[n].concat(experiments.filter( function(e) {
                		return e.coge.notebooks && dojo.indexOf(e.coge.notebooks, n.coge.id) != -1;
                	}))
                );
    		that.trackListWidgets.push( temp );
    	});
        
        // create a DnD source for remaining experiments
        temp = this._createDnDSource();
        temp.insertNodes(
            	false,
            	experiments.filter( function(e) {
            		return !e.coge.notebooks;
            	})
            );
        this.trackListWidgets.push( temp );
        
        return this.div;
    },
    
    _createDnDSource: function() {
        var div = dojo.create( 'div', {}, this.div );
    	
    	return new dndSource( // modifies div to be DnD-able
            div,
            {
                accept: ["track"], // accepts only tracks
                withHandles: false,
                copyOnly: true,
                checkAcceptance: function( source, nodes ) {
                	console.log('checkAcceptance');
                	var accept = true;
                	var target = this;
                	nodes.forEach( function (n) {
                		var type = source.map[n.id].data.coge.type;
	                	if (!type || type != 'experiment' || n.id in target.map) {
	                		accept = false;
	                	}
                	});
                	return accept;
                },
                creator: dojo.hitch( this, function( trackConfig, hint ) {
                	console.log('creator');
                	
                	var node = this._createLabelNode( trackConfig );
                	var coge = trackConfig.coge;
                	var name = trackConfig.key;
                	
                	node.id = coge.type + coge.id;
                	
                	if (coge.type == 'notebook') {
                		node.innerHTML = '<img src="picts/notebook-icon-small.png"/>' + 
                			'<span style="padding-left:3px" class="tracklist-text">' + name + '</span>';
                	}
                	else if (coge.type == 'experiment') {
                		node.innerHTML = '<img src="picts/testtube-icon-small.png"/>' + ' ' + 
                        	'<span class="tracklist-text">' + name + '</span>';
                		if (coge.notebooks) {
                			dojo.addClass(node, 'notebook-indent');
                		}
                	}
                	else {
                		node.innerHTML = '<span class="tracklist-text">' + name + '</span>';
                	}
                	
                    dojo.connect( node, "click", dojo.hitch(this, function(e) {
                    	//console.log('click ' + node.id + ' ' + e.shiftKey);
                    	if (dojo.hasClass(node, 'selected')) {
                    		this.browser.publish( '/jbrowse/v1/v/tracks/hide', [trackConfig] );
                    	}
                    	else {
                    		this.browser.publish( '/jbrowse/v1/v/tracks/show', [trackConfig] );
                    	}
                    }));
                    
                    // in the list, wrap the list item in a container for border drag-insertion-point monkeying
                    var container = dojo.create( 'div', { className: 'tracklist-container', style: { 'white-space': 'nowrap' } });
                    
                    if (coge.type == 'experiment') {
                    	// Start out hidden if inside notebook
                    	if (coge.notebooks) {
                    		dojo.addClass(container, 'collapsed');
                    	}
                    	
                		// Add delete button
                		var deleteButton = dom.create( // FIXME: how to put image in div using css?
                    			'img',
                        	    {	title: 'Remove experiment',
                    				src: 'js/jbrowse/plugins/CoGe/img/remove-icon.png',
                    				style: { // FIXME: move into css
                    					visibility: 'hidden',
                    					float: 'right', padding: '3px', width: '14px', height: '14px' }
                        	    }, 
                        	    container
                        	);
                		dojo.connect( deleteButton, "click", dojo.hitch(this, function(e) {
                			var notebookName;
                        	var notebookId;
                    		dojo.query('.coge-notebook', div).forEach( function(n) {
                    			notebookName = n.id;
                    			notebookId = notebookName.match(/\d+/);
                    		});
                    		if (notebookId) {
	                			dojo.xhrPut({
		      					    url: "NotebookView.pl",
		    					    putData: {
		    					    	fname: 'remove_list_item',
		    					    	lid: notebookId,
		    					    	item_type: '3', // FIXME: hardcoded type to experiment
		    					    	item_id: coge.id
		    					    },
		    					    handleAs: "json",
		    					    load: dojo.hitch(this, function(data) {
		    					    	div.removeChild(container);
		    					    	// Reload track in browser
		    		                	this.browser.view.tracks.forEach( function(track) {
		    		                		if (track.config.label == notebookName) {
		    		                			track.changed();
		    		                		}
		    		                	});
		    					    })
							    });
                    		}
                        }));
                		
                		// Add info button
                		var infoButton = dom.create( // FIXME: how to put image in div using css?
                    			'img',
                        	    {	title: 'Open info page',
                    				src: 'js/jbrowse/plugins/CoGe/img/info-icon.png',
                    				style: {
                    					visibility: 'hidden',
                    					float: 'right', padding: '3px', width: '14px', height: '14px' }
                        	    }, 
                        	    container
                        	);
                		
                		dojo.connect( infoButton, "click", dojo.hitch(this, function() {
                			//window.open( 'ExperimentView.pl?eid=' + coge.id );
                			
                			// Open dialog (copied from BlockBased.js)
                			var iframeDims = function() {
                                var d = domGeom.position( this.browser.container );
                                return { h: Math.round(d.h * 0.8), w: Math.round( d.w * 0.8 ) };
                            }.call(this);
                			
                            var dialog = new dijit.Dialog( { title: 'test' } );

                            var iframe = dojo.create(
                                'iframe', {
                                    tabindex: "0",
                                    width: iframeDims.w,
                                    height: iframeDims.h,
                                    style: { border: 'none' },
                                    src: trackConfig.onClick
                                });

                            dialog.set( 'content', iframe );
                            
                            var updateIframeSize = function() {
                                // hitch a ride on the dialog box's
                                // layout function, which is called on
                                // initial display, and when the window
                                // is resized, to keep the iframe
                                // sized to fit exactly in it.
                                var cDims = domGeom.position( dialog.containerNode );
                                var width  = cDims.w;
                                var height = cDims.h - domGeom.position(dialog.titleBar).h;
                                iframe.width = width;
                                iframe.height = height;
                            };
                            aspect.after( dialog, 'layout', updateIframeSize );
                            aspect.after( dialog, 'show', updateIframeSize );
                            
                            dialog.show();
                        }));
                		
                		// Show/hide buttons based on hover
                		dojo.connect( container, "onmouseenter", function(e) {
                			dojo.style(infoButton, 'visibility', 'visible');
                			dojo.style(deleteButton, 'visibility', 'visible');
                        });
                		dojo.connect( container, "onmouseleave", function(e) {
                			dojo.style(infoButton, 'visibility', 'hidden');
                			dojo.style(deleteButton, 'visibility', 'hidden');
                        });
                    }
                    else if (coge.type == 'notebook') {
                    	var button = dom.create( // FIXME: how to put image in div using css?
                    			'img',
                        	    {	className: 'notebookExpandIcon',
                    				src: 'js/jbrowse/plugins/CoGe/img/arrow-right-icon.png',
                    				style: { float: 'right', padding: '5px' }
                        	    }, 
                        	    container
                        	);
                    	dojo.connect( button, "click", dojo.hitch(this, function() {
                    		dojo.toggleClass(button, 'notebookExpandIcon notebookCollapseIcon');
                            if (dojo.hasClass(button, 'notebookExpandIcon')) {
                            	button.src = 'js/jbrowse/plugins/CoGe/img/arrow-right-icon.png';
                            	// Hide child nodes
                            	var children = div.children;
                            	for (var i = 1;  i < children.length;  i++) {
		                            dojo.addClass(children[i], 'collapsed');
                            	}
                            }
                            else {
                            	button.src = 'js/jbrowse/plugins/CoGe/img/arrow-down-icon.png';
                            	// Show child nodes
                            	var children = div.children;
                            	for (var i = 1;  i < children.length;  i++) {
		                            dojo.removeClass(children[i], 'collapsed');
                            	}
                            }
                        }));
                    }
                    
                    container.appendChild(node);
                    container.id = dojo.dnd.getUniqueId();
                    
                    return {node: container, data: trackConfig, type: ["track", coge.type]};
                })
            }
        ); 
    },
    
    _createTextFilter: function( trackConfigs ) {
        this.textFilterDiv = dom.create( 'div', {
            className: 'textfilter',
            style: { width: '100%', position: 'relative', overflow: 'hidden' }
        }, this.div );
        
		this.textFilterInput = dom.create(
			'input',
			{	type: 'text',
				style: { cursor: 'text', paddingLeft: '18px', height: '16px', width: '75%' },
				placeholder: 'filter by text',
				onkeypress: dojo.hitch( this, function( evt ) {
					if( this.textFilterTimeout )
						window.clearTimeout( this.textFilterTimeout );
					this.textFilterTimeout = window.setTimeout(
						dojo.hitch( this, function() {
						      this._updateTextFilterControl();
						      this._textFilter( this.textFilterInput.value, this.filteredNodes );
						  }),
						500
					);
					this._updateTextFilterControl();
					
					evt.stopPropagation();
				})
			},
			dom.create('div',{ style: 'overflow: show;' }, this.textFilterDiv )
		);
		
		this.textFilterClearButton = dom.create('div', {
			className: 'jbrowseIconCancel',
			onclick: dojo.hitch( this, function() {
				this._clearTextFilterControl();
				this._textFilter( this.textFilterInput.value, this.filteredNodes );
			}),
			style: { // FIXME move into css
				cursor: 'pointer', position: 'absolute', left: '4px', top: '2px' }
		}, this.textFilterDiv );
		
		this.textFilterAddAllButton = dom.create('img', { // FIXME: style with css icon instead of img
			title: 'Add all experiments',
			src: 'js/jbrowse/plugins/CoGe/img/plus-icon.png',
			style: { cursor: 'pointer', position: 'absolute', right: '36px', top: '2px', width: '14px', height: '14px' },
			onclick: dojo.hitch( this, function() {
				var configs = getVisibleConfigs(this.div, trackConfigs);
				if (configs.length) {
					if (configs.length > this.maxTracksToAdd) {
					    var myDialog = new dijit.Dialog({
					        title: "Warning",
					        content: "There are too many tracks to add (>" + this.maxTracksToAdd + "), please filter them further.",
					        style: "width: 300px"
					    });
					    myDialog.show();
					}
					else {
						this.browser.publish( '/jbrowse/v1/v/tracks/show', configs );
					}
				}
			})
		}, this.textFilterDiv );
		
		this.textFilterClearAllButton = dom.create('img', { // FIXME: style with css icon instead of img
			title: 'Clear all experiments',
			src: 'js/jbrowse/plugins/CoGe/img/clear-icon.png',
			onclick: dojo.hitch( this, function() {
				var configs = getVisibleConfigs(this.div, trackConfigs);
				if (configs.length) {
					this.browser.publish( '/jbrowse/v1/v/tracks/hide', configs );
				}
			}),
			style: { cursor: 'pointer', position: 'absolute', right: '16px', top: '2px', width: '14px', height: '14px' }
		}, this.textFilterDiv );
    },
    
    _createLabelNode: function( trackConfig ) {
    	var coge = trackConfig.coge;
    	return dojo.create(
    				'div',
	                { className: 'coge-tracklist-label coge-' + coge.type,
	                  title: capitalize(coge.type) + " id" + coge.id + "\n" +
	                  		 "Name: " + coge.name + "\n" +
	                  		 "Description: " + coge.description + "\n" +
	                  		 (coge.annotations ?
	                  				coge.annotations
		                  				.map(function(a) {
	                  						return a.type + ': ' + a.text
	                  					})
	                  					.join("\n")
	                  				: '')
	                }
	        	);
    },

    _textFilter: function( text, filteredNodes ) {
        if( text && /\S/.test(text) ) {
            text = text.toLowerCase();
            dojo.query( '.tracklist-text', this.div )
                .forEach( function( labelNode, i ) {
                	var container = labelNode.parentNode.parentNode;
                    if( labelNode.innerHTML.toLowerCase().indexOf( text ) != -1 ) {
                        dojo.removeClass( container, 'collapsed');
                        delete filteredNodes[container.id];
                    } 
                    else if (!dojo.hasClass(container, 'collapsed')) { // check if already hidden in collapsed notebook
                        dojo.addClass( container, 'collapsed');
                        filteredNodes[container.id] = container;
                    }
                 });
        } 
        else { // empty string, show all
//            dojo.query( '.tracklist-container.collapsed', this.div )
//                .removeClass('collapsed');
        	for (var id in filteredNodes) {
        		dojo.removeClass(filteredNodes[id], 'collapsed');
        	}
        	filteredNodes = {};
        }
    },

   /**
    * Clear the text filter control input.
    * @private
    */
    _clearTextFilterControl: function() {
        this.textFilterInput.value = '';
        this._updateTextFilterControl();
    },
    /**
     * Update the display of the text filter control based on whether
     * it has any text in it.
     * @private
     */
    _updateTextFilterControl: function() {
        if( this.textFilterInput.value.length )
            dojo.removeClass( this.textFilterDiv, 'dijitDisabled' );
        else
            dojo.addClass( this.textFilterDiv, 'dijitDisabled' );
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
    	console.log('setTracksActive ');
        dojo.query( '.coge-tracklist-label', this.div )
	        .forEach( function( labelNode, i ) {
	        	trackConfigs.forEach( function (trackConfig) {
	        		var trackId = trackConfig.coge.type + trackConfig.coge.id;
	        		if (labelNode.id == trackId) {
	    				dojo.addClass(labelNode, 'selected');
	        			if (dojo.hasClass(labelNode, 'coge-experiment')) {
	        				var id = trackConfig.coge.id;
	        				var color = getFeatureColor(id);
	        				dojo.style(labelNode, 'background', color);
	        			}
	        			else {
	        				dojo.style(labelNode, 'background', 'lightgray');
	        			}
	        		}
	        	});
	        });
    },

    // mdb: unused now
    deleteTracks: function( /**Array[Object]*/ trackConfigs ) { // mdb: unused now ...?
//    	console.log('deleteTracks');
//        // remove any tracks in our track list that are being set as visible
//        array.forEach( trackConfigs || [], function( conf ) {
//            var oldNode = this.inactiveTrackNodes[ conf.label ];
//            if( ! oldNode )
//                return;
//            delete this.inactiveTrackNodes[ conf.label ];
//
//            if( oldNode.parentNode )
//                oldNode.parentNode.removeChild( oldNode );
//
//            this.trackListWidget.delItem( oldNode.id );
//        },this);
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned off.
     */
    setTracksInactive: function( /**Array[Object]*/ trackConfigs ) {
    	console.log('setTracksInactive');
        dojo.query( '.coge-tracklist-label', this.div )
	        .forEach( function( labelNode, i ) {
	        	trackConfigs.forEach(function (trackConfig) {
	        		var trackId = trackConfig.coge.type + trackConfig.coge.id;
	        		if (labelNode.id == trackId) {
	    				dojo.style(labelNode, 'background', '');
	        			dojo.removeClass(labelNode, 'selected');
	        		}
	        	});
	        });  
    	
        // remove any tracks in our track list that are being set as visible
//        if( ! this.dndDrop ) {
//            var n = this.trackListWidget.insertNodes( false, trackConfigs );
//
//            // blink the track(s) that we just turned off to make it
//            // easier for users to tell where they went.
//            // note that insertNodes will have put its html element in
//            // inactivetracknodes
//            this._blinkTracks( trackConfigs );
//        }
    },
    
    _blinkTracks: function( trackConfigs ) {
    	console.log('_blinkTracks');
    	
        // scroll the tracklist all the way to the bottom so we can see the blinking nodes
//        this.trackListWidget.node.scrollTop = this.trackListWidget.node.scrollHeight;
//
//        array.forEach( trackConfigs, function(c) {
//            var label = this.inactiveTrackNodes[c.label].firstChild;
//            if( label ) {
//                dojo.animateProperty({
//                                         node: label,
//                                         duration: 400,
//                                         properties: {
//                                             backgroundColor: { start: '#DEDEDE', end:  '#FFDE2B' }
//                                         },
//                                         easing: animationEasing.sine,
//                                         repeat: 2,
//                                         onEnd: function() {
//                                             label.style.backgroundColor = null;
//                                         }
//                                     }).play();
//            }
//        },this);
    },
    
    /**
     * Make the track selector visible.
     * This does nothing for the Simple track selector, since it is always visible.
     */
    show: function() {
    },

    /**
     * Make the track selector invisible.
     * This does nothing for the Simple track selector, since it is always visible.
     */
    hide: function() {
    },

    /**
     * Toggle visibility of this track selector.
     * This does nothing for the Simple track selector, since it is always visible.
     */
    toggle: function() {
    }

});
});

function getVisibleConfigs(div, trackConfigs) {
	var visibleConfigs = [];
	dojo.query( '.coge-experiment, .coge-notebook', div ) // TODO: optimize this
	    .forEach( function( labelNode ) {
	    	if (!dojo.hasClass(labelNode.parentNode, 'collapsed')) {
	        	for (var i = 0;  i < trackConfigs.length;  i++) {
	        		var conf = trackConfigs[i];
	        		var trackId = conf.coge.type + conf.coge.id;
	        		if (labelNode.id == trackId) {
	        			visibleConfigs.push(conf);
	    				return;
	        		}
	        	}
	    	}
	    });
	return visibleConfigs;
}

function getFeatureColor(id) { //FIXME: dup'ed in MultiXYPlot.js
	return '#' + ((((id * 1234321) % 0x1000000) | 0x444444) & 0xe7e7e7 ).toString(16); 
}

function capitalize( string ) { //FIXME: doesn't go here, extend String class instead
    return string.charAt(0).toUpperCase() + string.slice(1);
}

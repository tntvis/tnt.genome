(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
tnt.genome = require("./index.js");
tnt.utils = require("tnt.utils");
tnt.board = require("tnt.board");
tnt.tooltip = require("tnt.tooltip");

//module.exports = tnt_genome = require("./index.js");

},{"./index.js":2,"tnt.board":5,"tnt.tooltip":25,"tnt.utils":29}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/index.js");


},{"./src/index.js":36}],3:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":4}],4:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],5:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = board = require("./src/index");

},{"./src/index":9}],6:[function(require,module,exports){
var apijs = require ("tnt.api");
var deferCancel = require ("tnt.utils").defer_cancel;

var board = function() {
    "use strict";
    
    //// Private vars
    var svg;
    var div_id;
    var tracks = [];
    var min_width = 50;
    var height    = 0;    // This is the global height including all the tracks
    var width     = 920;
    var height_offset = 20;
    var loc = {
	species  : undefined,
	chr      : undefined,
        from     : 0,
        to       : 500
    };

    // TODO: We have now background color in the tracks. Can this be removed?
    // It looks like it is used in the too-wide pane etc, but it may not be needed anymore
    var bgColor   = d3.rgb('#F8FBEF'); //#F8FBEF
    var pane; // Draggable pane
    var svg_g;
    var xScale;
    var zoomEventHandler = d3.behavior.zoom();
    var limits = {
	left : 0,
	right : 1000,
	zoom_out : 1000,
	zoom_in  : 100
    };
    var cap_width = 3;
    var dur = 500;
    var drag_allowed = true;

    var exports = {
	ease          : d3.ease("cubic-in-out"),
	extend_canvas : {
	    left : 0,
	    right : 0
	},
	show_frame : true
	// limits        : function () {throw "The limits method should be defined"}	
    };

    // The returned closure / object
    var track_vis = function(div) {
	div_id = d3.select(div).attr("id");

	// The original div is classed with the tnt class
	d3.select(div)
	    .classed("tnt", true);

	// TODO: Move the styling to the scss?
	var browserDiv = d3.select(div)
	    .append("div")
	    .attr("id", "tnt_" + div_id)
	    .style("position", "relative")
	    .classed("tnt_framed", exports.show_frame ? true : false)
	    .style("width", (width + cap_width*2 + exports.extend_canvas.right + exports.extend_canvas.left) + "px")

	var groupDiv = browserDiv
	    .append("div")
	    .attr("class", "tnt_groupDiv");

	// The SVG
	svg = groupDiv
	    .append("svg")
	    .attr("class", "tnt_svg")
	    .attr("width", width)
	    .attr("height", height)
	    .attr("pointer-events", "all");

	svg_g = svg
	    .append("g")
            .attr("transform", "translate(0,20)")
            .append("g")
	    .attr("class", "tnt_g");

	// caps
	svg_g
	    .append("rect")
	    .attr("id", "tnt_" + div_id + "_5pcap")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", 0)
	    .attr("height", height)
	    .attr("fill", "red");
	svg_g
	    .append("rect")
	    .attr("id", "tnt_" + div_id + "_3pcap")
	    .attr("x", width-cap_width)
	    .attr("y", 0)
	    .attr("width", 0)
	    .attr("height", height)
	    .attr("fill", "red");

	// The Zooming/Panning Pane
	pane = svg_g
	    .append("rect")
	    .attr("class", "tnt_pane")
	    .attr("id", "tnt_" + div_id + "_pane")
	    .attr("width", width)
	    .attr("height", height)
	    .style("fill", bgColor);

	// ** TODO: Wouldn't be better to have these messages by track?
	// var tooWide_text = svg_g
	//     .append("text")
	//     .attr("class", "tnt_wideOK_text")
	//     .attr("id", "tnt_" + div_id + "_tooWide")
	//     .attr("fill", bgColor)
	//     .text("Region too wide");

	// TODO: I don't know if this is the best way (and portable) way
	// of centering the text in the text area
	// var bb = tooWide_text[0][0].getBBox();
	// tooWide_text
	//     .attr("x", ~~(width/2 - bb.width/2))
	//     .attr("y", ~~(height/2 - bb.height/2));
    };

    // API
    var api = apijs (track_vis)
	.getset (exports)
	.getset (limits)
	.getset (loc);

    api.transform (track_vis.extend_canvas, function (val) {
	var prev_val = track_vis.extend_canvas();
	val.left = val.left || prev_val.left;
	val.right = val.right || prev_val.right;
	return val;
    });

    // track_vis always starts on loc.from & loc.to
    api.method ('start', function () {

	// Reset the tracks
	for (var i=0; i<tracks.length; i++) {
	    if (tracks[i].g) {
		tracks[i].display().reset.call(tracks[i]);
	    }
	    _init_track(tracks[i]);
	}

	_place_tracks();

	// The continuation callback
	var cont = function (resp) {
	    limits.right = resp;

	    // zoomEventHandler.xExtent([limits.left, limits.right]);
	    if ((loc.to - loc.from) < limits.zoom_in) {
		if ((loc.from + limits.zoom_in) > limits.zoom_in) {
		    loc.to = limits.right;
		} else {
		    loc.to = loc.from + limits.zoom_in;
		}
	    }
	    plot();

	    for (var i=0; i<tracks.length; i++) {
		_update_track(tracks[i], loc);
	    }
	};

	// If limits.right is a function, we have to call it asynchronously and
	// then starting the plot once we have set the right limit (plot)
	// If not, we assume that it is an objet with new (maybe partially defined)
	// definitions of the limits and we can plot directly
	// TODO: Right now, only right can be called as an async function which is weak
	if (typeof (limits.right) === 'function') {
	    limits.right(cont);
	} else {
	    cont(limits.right);
	}

    });

    api.method ('update', function () {
	for (var i=0; i<tracks.length; i++) {
	    _update_track (tracks[i]);
	}

    });

    var _update_track = function (track, where) {
	if (track.data()) {
	    var data_updater = track.data().update();
	    data_updater({
		'loc' : where,
		'on_success' : function () {
		    track.display().update.call(track, xScale);
		}
	    });
	}
    };

    var plot = function() {

	xScale = d3.scale.linear()
	    .domain([loc.from, loc.to])
	    .range([0, width]);

	if (drag_allowed) {
	    svg_g.call( zoomEventHandler
		       .x(xScale)
		       .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
		       .on("zoom", _move)
		     );
	}

    };

    // right/left/zoom pans or zooms the track. These methods are exposed to allow external buttons, etc to interact with the tracks. The argument is the amount of panning/zooming (ie. 1.2 means 20% panning) With left/right only positive numbers are allowed.
    api.method ('move_right', function (factor) {
	if (factor > 0) {
	    _manual_move(factor, 1);
	}
    });

    api.method ('move_left', function (factor) {
	if (factor > 0) {
	    _manual_move(factor, -1);
	}
    });

    api.method ('zoom', function (factor) {
	_manual_move(factor, 0);
    });

    api.method ('find_track_by_id', function (id) {
	for (var i=0; i<tracks.length; i++) {
	    if (tracks[i].id() === id) {
		return tracks[i];
	    }
	}
    });

    api.method ('reorder', function (new_tracks) {
	// TODO: This is defining a new height, but the global height is used to define the size of several
	// parts. We should do this dynamically

	for (var j=0; j<new_tracks.length; j++) {
	    var found = false;
	    for (var i=0; i<tracks.length; i++) {
		if (tracks[i].id() === new_tracks[j].id()) {
		    found = true;
		    tracks.splice(i,1);
		    break;
		}
	    }
	    if (!found) {
		_init_track(new_tracks[j]);
		_update_track(new_tracks[j], {from : loc.from, to : loc.to});
	    }
	}

	for (var x=0; x<tracks.length; x++) {
	    tracks[x].g.remove();
	}

	tracks = new_tracks;
	_place_tracks();

    });

    api.method ('remove_track', function (track) {
	track.g.remove();
    });

    api.method ('add_track', function (track) {
	if (track instanceof Array) {
	    for (var i=0; i<track.length; i++) {
		track_vis.add_track (track[i]);
	    }
	    return track_vis;
	}
	tracks.push(track);
	return track_vis;
    });

    api.method('tracks', function (new_tracks) {
	if (!arguments.length) {
	    return tracks
	}
	tracks = new_tracks;
	return track_vis;
    });

    // 
    api.method ('width', function (w) {
	// TODO: Allow suffixes like "1000px"?
	// TODO: Test wrong formats
	if (!arguments.length) {
	    return width;
	}
	// At least min-width
	if (w < min_width) {
	    w = min_width
	}

	// We are resizing
	if (div_id !== undefined) {
	    d3.select("#tnt_" + div_id).select("svg").attr("width", w);
	    // Resize the zooming/panning pane
	    d3.select("#tnt_" + div_id).style("width", (parseInt(w) + cap_width*2) + "px");
	    d3.select("#tnt_" + div_id + "_pane").attr("width", w);

	    // Replot
	    width = w;
	    plot();
	    for (var i=0; i<tracks.length; i++) {
		tracks[i].g.select("rect").attr("width", w);
		tracks[i].display().reset.call(tracks[i]);
		tracks[i].display().update.call(tracks[i],xScale);
	    }
	    
	} else {
	    width = w;
	}
	
	return track_vis;
    });

    api.method('allow_drag', function(b) {
	if (!arguments.length) {
	    return drag_allowed;
	}
	drag_allowed = b;
	if (drag_allowed) {
	    // When this method is called on the object before starting the simulation, we don't have defined xScale
	    if (xScale !== undefined) {
		svg_g.call( zoomEventHandler.x(xScale)
			   // .xExtent([0, limits.right])
			   .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
			   .on("zoom", _move) );
	    }
	} else {
	    // We create a new dummy scale in x to avoid dragging the previous one
	    // TODO: There may be a cheaper way of doing this?
	    zoomEventHandler.x(d3.scale.linear()).on("zoom", null);
	}
	return track_vis;
    });

    var _place_tracks = function () {
	var h = 0;
	for (var i=0; i<tracks.length; i++) {
	    var track = tracks[i];
	    if (track.g.attr("transform")) {
		track.g
		    .transition()
		    .duration(dur)
		    .attr("transform", "translate(0," + h + ")");
	    } else {
		track.g
		    .attr("transform", "translate(0," + h + ")");
	    }

	    h += track.height();
	}

	// svg
	svg.attr("height", h + height_offset);

	// div
	d3.select("#tnt_" + div_id)
	    .style("height", (h + 10 + height_offset) + "px");

	// caps
	d3.select("#tnt_" + div_id + "_5pcap")
	    .attr("height", h)
	    // .move_to_front()
	    .each(function (d) {
		move_to_front(this);
	    })
	d3.select("#tnt_" + div_id + "_3pcap")
	    .attr("height", h)
	//.move_to_front()
	    .each (function (d) {
		move_to_front(this);
	    });
	

	// pane
	pane
	    .attr("height", h + height_offset);

	// tooWide_text. TODO: Is this still needed?
	// var tooWide_text = d3.select("#tnt_" + div_id + "_tooWide");
	// var bb = tooWide_text[0][0].getBBox();
	// tooWide_text
	//     .attr("y", ~~(h/2) - bb.height/2);

	return track_vis;
    }

    var _init_track = function (track) {
	track.g = svg.select("g").select("g")
	    .append("g")
	    .attr("class", "tnt_track")
	    .attr("height", track.height());

	// Rect for the background color
	track.g
	    .append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", track_vis.width())
	    .attr("height", track.height())
	    .style("fill", track.background_color())
	    .style("pointer-events", "none");

	if (track.display()) {
	    track.display().init.call(track, width);
	}
	
	return track_vis;
    };

    var _manual_move = function (factor, direction) {
	var oldDomain = xScale.domain();

	var span = oldDomain[1] - oldDomain[0];
	var offset = (span * factor) - span;

	var newDomain;
	switch (direction) {
	case -1 :
	    newDomain = [(~~oldDomain[0] - offset), ~~(oldDomain[1] - offset)];
	    break;
	case 1 :
	    newDomain = [(~~oldDomain[0] + offset), ~~(oldDomain[1] - offset)];
	    break;
	case 0 :
	    newDomain = [oldDomain[0] - ~~(offset/2), oldDomain[1] + (~~offset/2)];
	}

	var interpolator = d3.interpolateNumber(oldDomain[0], newDomain[0]);
	var ease = exports.ease;

	var x = 0;
	d3.timer(function() {
	    var curr_start = interpolator(ease(x));
	    var curr_end;
	    switch (direction) {
	    case -1 :
		curr_end = curr_start + span;
		break;
	    case 1 :
		curr_end = curr_start + span;
		break;
	    case 0 :
		curr_end = oldDomain[1] + oldDomain[0] - curr_start;
		break;
	    }

	    var currDomain = [curr_start, curr_end];
	    xScale.domain(currDomain);
	    _move(xScale);
	    x+=0.02;
	    return x>1;
	});
    };


    var _move_cbak = function () {
	var currDomain = xScale.domain();
	track_vis.from(~~currDomain[0]);
	track_vis.to(~~currDomain[1]);

	for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    _update_track(track, loc);
	}
    };
    // The deferred_cbak is deferred at least this amount of time or re-scheduled if deferred is called before
    var _deferred = deferCancel(_move_cbak, 300);

    // api.method('update', function () {
    // 	_move();
    // });

    var _move = function (new_xScale) {
	if (new_xScale !== undefined && drag_allowed) {
	    zoomEventHandler.x(new_xScale);
	}

	// Show the red bars at the limits
	var domain = xScale.domain();
	if (domain[0] <= 5) {
	    d3.select("#tnt_" + div_id + "_5pcap")
		.attr("width", cap_width)
		.transition()
		.duration(200)
		.attr("width", 0);
	}

	if (domain[1] >= (limits.right)-5) {
	    d3.select("#tnt_" + div_id + "_3pcap")
		.attr("width", cap_width)
		.transition()
		.duration(200)
		.attr("width", 0);
	}


	// Avoid moving past the limits
	if (domain[0] < limits.left) {
	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.left) + xScale.range()[0], zoomEventHandler.translate()[1]]);
	} else if (domain[1] > limits.right) {
	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.right) + xScale.range()[1], zoomEventHandler.translate()[1]]);
	}

	_deferred();

	for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    track.display().move.call(track,xScale);
	}
    };

    // api.method({
    // 	allow_drag : api_allow_drag,
    // 	width      : api_width,
    // 	add_track  : api_add_track,
    // 	reorder    : api_reorder,
    // 	zoom       : api_zoom,
    // 	left       : api_left,
    // 	right      : api_right,
    // 	start      : api_start
    // });

    // Auxiliar functions
    function move_to_front (elem) {
	elem.parentNode.appendChild(elem);
    }
    
    return track_vis;
};

module.exports = exports = board;

},{"tnt.api":3,"tnt.utils":29}],7:[function(require,module,exports){
var apijs = require ("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

// var board = {};
// board.track = {};

var data = function() {
    "use strict";
    var _ = function () {
    };

    // Getters / Setters
    apijs (_)
	.getset ('label', "")
	.getset ('elements', [])
	.getset ('update', function () {});


    // The retrievers. They need to access 'elements'
    data.retriever = {};

    data.retriever.sync = function() {
	var update_track = function(obj) {
        // Object has a location and a plug-in defined callback
            _.elements(update_track.retriever()(obj.loc));
            obj.on_success();
	};

	apijs (update_track)
	    .getset ('retriever', function () {})

	return update_track;
    };

    data.retriever.async = function () {
	var url = '';

	var update_track = function (obj) {
	    d3.json(url, function (err, resp) {
		_.elements(resp);
		obj.on_success();
	    }); 
	};

	apijs (update_track)
	    .getset ('url', '');

	return update_track;
    };

    data.retriever.ensembl = function() {
    	var success = [function () {}];
    	var endpoint;
    	var eRest = ensemblRestAPI();
    	var update_track = function(obj) {
            // Object has loc and a plug-in defined callback
            var loc         = obj.loc;
            var plugin_cbak = obj.on_success;
            eRest.call({url     : eRest.url[update_track.endpoint()](loc),
    			success : function (resp) {
                            _.elements(resp);

                        // User-defined
                            for (var i=0; i<success.length; i++) {
    				success[i](resp);
                            };

                        // Plug-in defined
                            plugin_cbak();
    			}
                       });

    	};

    	apijs(update_track)
    	    .getset('endpoint');

    // TODO: We don't have a way of resetting the success array
    // TODO: Should this also be included in the sync retriever?
    // Still not sure this is the best option to support more than one callback
    	update_track.success = function (callback) {
            if (!arguments.length) {
    		return success;
            }
            success.push(callback);
            return update_track;
    	};

    	return update_track;
    };


    return _;
};


// A predefined track for genes
// tnt.track.data.gene = function () {
//     var track = tnt.track.data();
// 	// .index("ID");

//     var updater = tnt.track.retriever.ensembl()
// 	.endpoint("region")
//     // TODO: If success is defined here, means that it can't be user-defined
//     // is that good? enough? API?
//     // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
// 	.success(function(genes) {
// 	    for (var i = 0; i < genes.length; i++) {
// 		if (genes[i].strand === -1) {  
// 		    genes[i].display_label = "<" + genes[i].external_name;
// 		} else {
// 		    genes[i].display_label = genes[i].external_name + ">";
// 		}
// 	    }
// 	});

//     return track.update(updater);
// }

// A predefined track displaying no external data
// it is used for location and axis tracks for example
data.empty = function () {
    var track = data();
    var updater = data.retriever.sync();
    track.update(updater);

    return track;
};

module.exports = exports = data;

},{"tnt.api":3,"tnt.ensembl":12}],8:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");

// FEATURE VIS
// var board = {};
// board.track = {};
var tnt_feature = function () {
    ////// Vars exposed in the API
    var exports = {
	create   : function () {throw "create_elem is not defined in the base feature object"},
	mover    : function () {throw "move_elem is not defined in the base feature object"},
	updater  : function () {},
	on_click : function () {},
	on_mouseover : function () {},
	guider   : function () {},
	index    : undefined,
	layout   : layout.identity(),
	foreground_color : '#000'
    };


    // The returned object
    var feature = {};

    var reset = function () {
    	var track = this;
    	track.g.selectAll(".tnt_elem").remove();
	track.g.selectAll(".tnt_guider").remove();
    };

    var init = function (width) {
	var track = this;
	exports.guider.call(track, width);
    };

    var plot = function (new_elems, track, xScale) {
	new_elems.on("click", exports.on_click);
	new_elems.on("mouseover", exports.on_mouseover);
	// new_elem is a g element where the feature is inserted
	exports.create.call(track, new_elems, xScale);
    };

    var update = function (xScale, field) {
	var track = this;
	var svg_g = track.g;
	var layout = exports.layout;

	var elements = track.data().elements();

	if (field !== undefined) {
	    elements = elements[field];
	}

	layout(elements, xScale);
	var data_elems = layout.elements();

	var vis_sel;
	var vis_elems;
	if (field !== undefined) {
	    vis_sel = svg_g.selectAll(".tnt_elem_" + field);
	} else {
	    vis_sel = svg_g.selectAll(".tnt_elem");
	}

	if (exports.index) { // Indexing by field
	    vis_elems = vis_sel
		.data(data_elems, function (d) {
		    if (d !== undefined) {
			return exports.index(d);
		    }
		})
	} else { // Indexing by position in array
	    vis_elems = vis_sel
		.data(data_elems)
	}

	exports.updater.call(track, vis_elems, xScale);

	var new_elem = vis_elems
	    .enter();

	new_elem
	    .append("g")
	    .attr("class", "tnt_elem")
	    .classed("tnt_elem_" + field, field)
	    .call(feature.plot, track, xScale);

	vis_elems
	    .exit()
	    .remove();
    };

    var move = function (xScale, field) {
	var track = this;
	var svg_g = track.g;
	var elems;
	// TODO: Is selecting the elements to move too slow?
	// It would be nice to profile
	if (field !== undefined) {
	    elems = svg_g.selectAll(".tnt_elem_" + field);
	} else {
	    elems = svg_g.selectAll(".tnt_elem");
	}

	exports.mover.call(this, elems, xScale);
    };

    var move_to_front = function (field) {
	if (field !== undefined) {
	    var track = this;
	    var svg_g = track.g;
	    svg_g.selectAll(".tnt_elem_" + field).move_to_front();
	}
    };

    // API
    apijs (feature)
	.getset (exports)
	.method ({
	    reset  : reset,
	    plot   : plot,
	    update : update,
	    move   : move,
	    init   : init,
	    move_to_front : move_to_front
	});

    return feature;
};

tnt_feature.composite = function () {
    var displays = {};
    var display_order = [];

    var features = {};

    var reset = function () {
	var track = this;
	for (var i=0; i<displays.length; i++) {
	    displays[i].reset.call(track);
	}
    };

    var init = function (width) {
	var track = this;
 	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].init.call(track, width);
	    }
	}
    };

    var update = function (xScale) {
	var track = this;
	for (var i=0; i<display_order.length; i++) {
	    displays[display_order[i]].update.call(track, xScale, display_order[i]);
	    displays[display_order[i]].move_to_front.call(track, display_order[i]);
	}
	// for (var display in displays) {
	//     if (displays.hasOwnProperty(display)) {
	// 	displays[display].update.call(track, xScale, display);
	//     }
	// }
    };

    var move = function (xScale) {
	var track = this;
	for (var display in displays) {
	    if (displays.hasOwnProperty(display)) {
		displays[display].move.call(track, xScale, display);
	    }
	}
    };

    var add = function (key, display) {
	displays[key] = display;
	display_order.push(key);
	return features;
    };

    // API
    apijs (features)
	.method ({
	    reset  : reset,
	    update : update,
	    move   : move,
	    init   : init,
	    add    : add
	});


    return features;
};

tnt_feature.sequence = function () {
    // 'Inherit' from tnt.track.feature
    var feature = tnt_feature();

    var config = {
	fontsize : 10,
	sequence : function (d) {
	    return d.sequence
	}
    };

    var api = apijs (feature)
	.getset (config);


    feature.create (function (new_nts, xScale) {
	var track = this;

	new_nts
	    .append("text")
	    .attr("fill", track.background_color())
	    .style('font-size', config.fontsize + "px")
	    .attr("x", function (d) {
		return xScale (d.pos);
	    })
	    .attr("y", function (d) {
		return ~~(track.height() / 2) + 5; 
	    })
	    .text(config.sequence)
	    .transition()
	    .duration(500)
	    .attr('fill', feature.foreground_color());
    });

    feature.mover (function (nts, xScale) {
	nts.select ("text")
	    .attr("x", function (d) {
		return xScale(d.pos);
	    });
    });

    return feature;
};

tnt_feature.area = function () {
    var feature = tnt_feature.line();
    var line = tnt_feature.line();

    var area = d3.svg.area()
	.interpolate(line.interpolate())
	.tension(feature.tension());

    var data_points;

    var line_create = feature.create(); // We 'save' line creation
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
//	     return;
	    track.g.select("path").remove();
	}

	line_create.call(track, points, xScale);

	area
	    .x(line.x())
	    .y1(line.y())
	    .y0(track.height());

	data_points = points.data();
	points.remove();

	track.g
	    .append("path")
	    .attr("class", "tnt_area")
	    .classed("tnt_elem", true)
	    .datum(data_points)
	    .attr("d", area)
	    .attr("fill", d3.rgb(feature.foreground_color()).brighter());
	
    });

    var line_mover = feature.mover();
    feature.mover (function (path, xScale) {
	var track = this;
	line_mover.call(track, path, xScale);

	area.x(line.x());
	track.g
	    .select(".tnt_area")
	    .datum(data_points)
	    .attr("d", area);
    });

    return feature;

};

tnt_feature.line = function () {
    var feature = tnt_feature();

    var x = function (d) {
	return d.pos;
    };
    var y = function (d) {
	return d.val;
    };
    var tension = 0.7;
    var yScale = d3.scale.linear();
    var line = d3.svg.line()
	.interpolate("basis");

    // line getter. TODO: Setter?
    feature.line = function () {
	return line;
    };

    feature.x = function (cbak) {
	if (!arguments.length) {
	    return x;
	}
	x = cbak;
	return feature;
    };

    feature.y = function (cbak) {
	if (!arguments.length) {
	    return y;
	}
	y = cbak;
	return feature;
    };

    feature.tension = function (t) {
	if (!arguments.length) {
	    return tension;
	}
	tension = t;
	return feature;
    };

    var data_points;

    // For now, create is a one-off event
    // TODO: Make it work with partial paths, ie. creating and displaying only the path that is being displayed
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
	    // return;
	    track.g.select("path").remove();
	}

	line
	    .tension(tension)
	    .x(function (d) {return xScale(x(d))})
	    .y(function (d) {return track.height() - yScale(y(d))})

	data_points = points.data();
	points.remove();

	yScale
	    .domain([0, 1])
	    // .domain([0, d3.max(data_points, function (d) {
	    // 	return y(d);
	    // })])
	    .range([0, track.height() - 2]);
	
	track.g
	    .append("path")
	    .attr("class", "tnt_elem")
	    .attr("d", line(data_points))
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 4)
	    .style("fill", "none");

    });

    feature.mover (function (path, xScale) {
	var track = this;

	line.x(function (d) {
	    return xScale(x(d))
	});
	track.g.select("path")
	    .attr("d", line(data_points));
    });

    return feature;
};

tnt_feature.conservation = function () {
    // 'Inherit' from feature.area
    var feature = tnt_feature.area();

    var area_create = feature.create(); // We 'save' area creation
    feature.create  (function (points, xScale) {
	var track = this;

	area_create.call(track, d3.select(points[0][0]), xScale)
    });

    return feature;
};

tnt_feature.ensembl = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var foreground_color2 = "#7FFF00";
    var foreground_color3 = "#00BB00";

    feature.guider (function (width) {
	var track = this;
	var height_offset = ~~(track.height() - (track.height()  * .8)) / 2;

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", height_offset)
	    .attr("y2", height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", track.height() - height_offset)
	    .attr("y2", track.height() - height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

    });

    feature.create (function (new_elems, xScale) {
	var track = this;

	var height_offset = ~~(track.height() - (track.height()  * .8)) / 2;

	new_elems
	    .append("rect")
	    .attr("x", function (d) {
		return xScale (d.start);
	    })
	    .attr("y", height_offset)
// 	    .attr("rx", 3)
// 	    .attr("ry", 3)
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", track.height() - ~~(height_offset * 2))
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) { 
		if (d.type === 'high') {
		    return d3.rgb(feature.foreground_color());
		}
		if (d.type === 'low') {
		    return d3.rgb(feature.foreground_color2());
		}
		return d3.rgb(feature.foreground_color3());
	    });
    });

    feature.updater (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start))
	    });
    });

    feature.mover (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.foreground_color2 = function (col) {
	if (!arguments.length) {
	    return foreground_color2;
	}
	foreground_color2 = col;
	return feature;
    };

    feature.foreground_color3 = function (col) {
	if (!arguments.length) {
	    return foreground_color3;
	}
	foreground_color3 = col;
	return feature;
    };

    return feature;
};

tnt_feature.vline = function () {
    // 'Inherit' from feature
    var feature = tnt_feature();

    feature.create (function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append ("line")
	    .attr("x1", function (d) {
		// TODO: Should use the index value?
		return xScale(feature.index()(d))
	    })
	    .attr("x2", function (d) {
		return xScale(feature.index()(d))
	    })
	    .attr("y1", 0)
	    .attr("y2", track.height())
	    .attr("stroke", feature.foreground_color())
	    .attr("stroke-width", 1);
    });

    feature.mover (function (vlines, xScale) {
	vlines
	    .select("line")
	    .attr("x1", function (d) {
		return xScale(feature.index()(d));
	    })
	    .attr("x2", function (d) {
		return xScale(feature.index()(d));
	    });
    });

    return feature;

};

tnt_feature.block = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    apijs(feature)
	.getset('from', function (d) {
	    return d.start;
	})
	.getset('to', function (d) {
	    return d.end;
	});

    feature.create(function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append("rect")
	    .attr("x", function (d, i) {
		// TODO: start, end should be adjustable via the tracks API
		return xScale(feature.from()(d, i));
	    })
	    .attr("y", 0)
	    .attr("width", function (d, i) {
		return (xScale(feature.to()(d, i)) - xScale(feature.from()(d, i)));
	    })
	    .attr("height", track.height())
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
		if (d.color === undefined) {
		    return feature.foreground_color();
		} else {
		    return d.color;
		}
	    });
    });

    feature.updater(function (elems, xScale) {
	elems
	    .select("rect")
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.mover(function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });
    });

    return feature;

};

tnt_feature.axis = function () {
    var xAxis;
    var orientation = "top";

    // Axis doesn't inherit from feature
    var feature = {};
    feature.reset = function () {
	xAxis = undefined;
	var track = this;
	track.g.selectAll("rect").remove();
	track.g.selectAll(".tick").remove();
    };
    feature.plot = function () {};
    feature.move = function () {
	var track = this;
	var svg_g = track.g;
	svg_g.call(xAxis);
    }
    
    feature.init = function () {};

    feature.update = function (xScale) {
	// Create Axis if it doesn't exist
	if (xAxis === undefined) {
	    xAxis = d3.svg.axis()
		.scale(xScale)
		.orient(orientation);
	}

	var track = this;
	var svg_g = track.g;
	svg_g.call(xAxis);
    };

    feature.orientation = function (pos) {
	if (!arguments.length) {
	    return orientation;
	}
	orientation = pos;
	return feature;
    };

    return feature;
};

tnt_feature.location = function () {
    var row;

    var feature = {};
    feature.reset = function () {};
    feature.plot = function () {};
    feature.init = function () {};
    feature.move = function(xScale) {
	var domain = xScale.domain();
	row.select("text")
	    .text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    };

    feature.update = function (xScale) {
	var track = this;
	var svg_g = track.g;
	var domain = xScale.domain();
	if (row === undefined) {
	    row = svg_g;
	    row
		.append("text")
		.text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
	}
    };

    return feature;
};

module.exports = exports = tnt_feature;

},{"./layout.js":10,"tnt.api":3}],9:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");

module.exports = exports = board;

},{"./board.js":6,"./data.js":7,"./feature.js":8,"./layout.js":10,"./track":11}],10:[function(require,module,exports){
var apijs = require ("tnt.api");

// var board = {};
// board.track = {};
layout = {};

layout.identity = function () {
    // vars exposed in the API:
    var elements;

    // The returned closure / object
    var l = function (new_elements) {
	elements = new_elements;
    }

    var api = apijs (l)
	.method ({
	    height   : function () {},
	    elements : function () {
		return elements;
	    }
	});

    return l;
};

module.exports = exports = layout;

},{"tnt.api":3}],11:[function(require,module,exports){
var apijs = require ("tnt.api");
var iterator = require("tnt.utils").iterator;

//var board = {};

var track = function () {
    "use strict";

    var read_conf = {
	// Unique ID for this track
	id : track.id()
    };

    var display;

    var conf = {
	// foreground_color : d3.rgb('#000000'),
	background_color : d3.rgb('#CCCCCC'),
	height           : 250,
	// data is the object (normally a tnt.track.data object) used to retrieve and update data for the track
	data             : track.data.empty()
    };

    // The returned object / closure
    var _ = function() {
    };

    // API
    var api = apijs (_)
	.getset (conf)
	.get (read_conf);

    // TODO: This means that height should be defined before display
    // we shouldn't rely on this
    _.display = function (new_plotter) {
	if (!arguments.length) {
	    return display;
	}
	display = new_plotter;
	if (typeof (display) === 'function') {
	    display.layout && display.layout().height(conf.height);	    
	} else {
	    for (var key in display) {
		if (display.hasOwnProperty(key)) {
		    display[key].layout && display[key].layout().height(conf.height);
		}
	    }
	}

	return _;
    };

    return _;

};

track.id = iterator(1);

module.exports = exports = track;

},{"tnt.api":3,"tnt.utils":29}],12:[function(require,module,exports){
module.exports = tnt_ensembl = require("./src/rest.js");

},{"./src/rest.js":24}],13:[function(require,module,exports){
'use strict';

var Response = require('./response');

function RequestError(message, props) {
    var err = new Error(message);
    err.name = 'RequestError';
    this.name = err.name;
    this.message = err.message;
    if (err.stack) {
        this.stack = err.stack;
    }

    this.toString = function () {
        return this.message;
    };

    for (var k in props) {
        if (props.hasOwnProperty(k)) {
            this[k] = props[k];
        }
    }
}

RequestError.prototype = Error.prototype;

RequestError.create = function (message, req, props) {
    var err = new RequestError(message, props);
    Response.call(err, req);
    return err;
};

module.exports = RequestError;

},{"./response":16}],14:[function(require,module,exports){
'use strict';

var i,
    cleanURL = require('../plugins/cleanurl'),
    XHR = require('./xhr'),
    delay = require('./utils/delay'),
    createError = require('./error').create,
    Response = require('./response'),
    Request = require('./request'),
    extend = require('xtend'),
    once = require('./utils/once');

function factory(defaults, plugins) {
    defaults = defaults || {};
    plugins = plugins || [];

    function http(req, cb) {
        var xhr, plugin, done, k, timeoutId;

        req = new Request(extend(defaults, req));

        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.processRequest) {
                plugin.processRequest(req);
            }
        }

        // Give the plugins a chance to create the XHR object
        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.createXHR) {
                xhr = plugin.createXHR(req);
                break; // First come, first serve
            }
        }
        xhr = xhr || new XHR();

        req.xhr = xhr;

        // Because XHR can be an XMLHttpRequest or an XDomainRequest, we add
        // `onreadystatechange`, `onload`, and `onerror` callbacks. We use the
        // `once` util to make sure that only one is called (and it's only called
        // one time).
        done = once(delay(function (err) {
            clearTimeout(timeoutId);
            xhr.onload = xhr.onerror = xhr.onreadystatechange = xhr.ontimeout = xhr.onprogress = null;
            var res = err && err.isHttpError ? err : new Response(req);
            for (i = 0; i < plugins.length; i++) {
                plugin = plugins[i];
                if (plugin.processResponse) {
                    plugin.processResponse(res);
                }
            }
            if (err) {
                if (req.onerror) {
                    req.onerror(err);
                }
            } else {
                if (req.onload) {
                    req.onload(res);
                }
            }
            if (cb) {
                cb(err, res);
            }
        }));

        // When the request completes, continue.
        xhr.onreadystatechange = function () {
            if (req.timedOut) return;

            if (req.aborted) {
                done(createError('Request aborted', req, {name: 'Abort'}));
            } else if (xhr.readyState === 4) {
                var type = Math.floor(xhr.status / 100);
                if (type === 2) {
                    done();
                } else if (xhr.status === 404 && !req.errorOn404) {
                    done();
                } else {
                    var kind;
                    switch (type) {
                        case 4:
                            kind = 'Client';
                            break;
                        case 5:
                            kind = 'Server';
                            break;
                        default:
                            kind = 'HTTP';
                    }
                    var msg = kind + ' Error: ' +
                              'The server returned a status of ' + xhr.status +
                              ' for the request "' +
                              req.method.toUpperCase() + ' ' + req.url + '"';
                    done(createError(msg, req));
                }
            }
        };

        // `onload` is only called on success and, in IE, will be called without
        // `xhr.status` having been set, so we don't check it.
        xhr.onload = function () { done(); };

        xhr.onerror = function () {
            done(createError('Internal XHR Error', req));
        };

        // IE sometimes fails if you don't specify every handler.
        // See http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified?forum=iewebdevelopment
        xhr.ontimeout = function () { /* noop */ };
        xhr.onprogress = function () { /* noop */ };

        xhr.open(req.method, req.url);

        if (req.timeout) {
            // If we use the normal XHR timeout mechanism (`xhr.timeout` and
            // `xhr.ontimeout`), `onreadystatechange` will be triggered before
            // `ontimeout`. There's no way to recognize that it was triggered by
            // a timeout, and we'd be unable to dispatch the right error.
            timeoutId = setTimeout(function () {
                req.timedOut = true;
                done(createError('Request timeout', req, {name: 'Timeout'}));
                try {
                    xhr.abort();
                } catch (err) {}
            }, req.timeout);
        }

        for (k in req.headers) {
            if (req.headers.hasOwnProperty(k)) {
                xhr.setRequestHeader(k, req.headers[k]);
            }
        }

        xhr.send(req.body);

        return req;
    }

    var method,
        methods = ['get', 'post', 'put', 'head', 'patch', 'delete'],
        verb = function (method) {
            return function (req, cb) {
                req = new Request(req);
                req.method = method;
                return http(req, cb);
            };
        };
    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        http[method] = verb(method);
    }

    http.plugins = function () {
        return plugins;
    };

    http.defaults = function (newValues) {
        if (newValues) {
            return factory(extend(defaults, newValues), plugins);
        }
        return defaults;
    };

    http.use = function () {
        var newPlugins = Array.prototype.slice.call(arguments, 0);
        return factory(defaults, plugins.concat(newPlugins));
    };

    http.bare = function () {
        return factory();
    };

    http.Request = Request;
    http.Response = Response;

    return http;
}

module.exports = factory({}, [cleanURL]);

},{"../plugins/cleanurl":21,"./error":13,"./request":15,"./response":16,"./utils/delay":17,"./utils/once":18,"./xhr":19,"xtend":20}],15:[function(require,module,exports){
'use strict';

function Request(optsOrUrl) {
    var opts = typeof optsOrUrl === 'string' ? {url: optsOrUrl} : optsOrUrl || {};
    this.method = opts.method ? opts.method.toUpperCase() : 'GET';
    this.url = opts.url;
    this.headers = opts.headers || {};
    this.body = opts.body;
    this.timeout = opts.timeout || 0;
    this.errorOn404 = opts.errorOn404 != null ? opts.errorOn404 : true;
    this.onload = opts.onload;
    this.onerror = opts.onerror;
}

Request.prototype.abort = function () {
    if (this.aborted) return;
    this.aborted = true;
    this.xhr.abort();
    return this;
};

Request.prototype.header = function (name, value) {
    var k;
    for (k in this.headers) {
        if (this.headers.hasOwnProperty(k)) {
            if (name.toLowerCase() === k.toLowerCase()) {
                if (arguments.length === 1) {
                    return this.headers[k];
                }

                delete this.headers[k];
                break;
            }
        }
    }
    if (value != null) {
        this.headers[name] = value;
        return value;
    }
};


module.exports = Request;

},{}],16:[function(require,module,exports){
'use strict';

var Request = require('./request');


function Response(req) {
    var i, lines, m,
        xhr = req.xhr;
    this.request = req;
    this.xhr = xhr;
    this.headers = {};

    // Browsers don't like you trying to read XHR properties when you abort the
    // request, so we don't.
    if (req.aborted || req.timedOut) return;

    this.status = xhr.status || 0;
    this.text = xhr.responseText;
    this.body = xhr.response || xhr.responseText;
    this.contentType = xhr.contentType || (xhr.getResponseHeader && xhr.getResponseHeader('Content-Type'));

    if (xhr.getAllResponseHeaders) {
        lines = xhr.getAllResponseHeaders().split('\n');
        for (i = 0; i < lines.length; i++) {
            if ((m = lines[i].match(/\s*([^\s]+):\s+([^\s]+)/))) {
                this.headers[m[1]] = m[2];
            }
        }
    }

    this.isHttpError = this.status >= 400;
}

Response.prototype.header = Request.prototype.header;


module.exports = Response;

},{"./request":15}],17:[function(require,module,exports){
'use strict';

// Wrap a function in a `setTimeout` call. This is used to guarantee async
// behavior, which can avoid unexpected errors.

module.exports = function (fn) {
    return function () {
        var
            args = Array.prototype.slice.call(arguments, 0),
            newFunc = function () {
                return fn.apply(null, args);
            };
        setTimeout(newFunc, 0);
    };
};

},{}],18:[function(require,module,exports){
'use strict';

// A "once" utility.
module.exports = function (fn) {
    var result, called = false;
    return function () {
        if (!called) {
            called = true;
            result = fn.apply(this, arguments);
        }
        return result;
    };
};

},{}],19:[function(require,module,exports){
module.exports = window.XMLHttpRequest;

},{}],20:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],21:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        req.url = req.url.replace(/[^%]+/g, function (s) {
            return encodeURI(s);
        });
    }
};

},{}],22:[function(require,module,exports){
module.exports=require(3)
},{"./src/api.js":23}],23:[function(require,module,exports){
module.exports=require(4)
},{}],24:[function(require,module,exports){
var http = require("httpplease");
var apijs = require("tnt.api");

tnt_eRest = function() {

    // Prefixes to use the REST API.
    // These are modified in the localREST setter
    var prefix = "http://rest.ensembl.org";
    var prefix_region = prefix + "/overlap/region/";
    var prefix_ensgene = prefix + "/lookup/id/";
    var prefix_xref = prefix + "/xrefs/symbol/";
    var prefix_homologues = prefix + "/homology/id/";
    var prefix_chr_info = prefix + "/info/assembly/";
    var prefix_aln_region = prefix + "/alignment/region/";
    var prefix_gene_tree = prefix + "/genetree/id/";
    var prefix_assembly = prefix + "/info/assembly/";

    // Number of connections made to the database
    var connections = 0;

    var eRest = function() {
    };

    // Limits imposed by the ensembl REST API
    eRest.limits = {
	region : 5000000
    };

    var api = apijs (eRest);


    /** <strong>localREST</strong> points the queries to a local REST service to debug.
	TODO: This method should be removed in "production"
    */
    api.method ('localREST', function() {
	prefix = "http://127.0.0.1:3000";
	prefix_region = prefix + "/overlap/region/";
	prefix_ensgene = prefix + "/lookup/id/";
	prefix_xref = prefix + "/xrefs/symbol/";
	prefix_homologues = prefix + "/homology/id/";

	return eRest;
    });

    /** <strong>call</strong> makes an asynchronous call to the ensembl REST service.
	@param {Object} object - A literal object containing the following fields:
	<ul>
	<li>url => The rest URL. This is returned by {@link eRest.url}</li>
	<li>success => A callback to be called when the REST query is successful (i.e. the response from the server is a defined value and no error has been returned)</li>
	<li>error => A callback to be called when the REST query returns an error
	</ul>
    */
    api.method ('call', function (obj) {
	var url = obj.url;
	var on_success = obj.success;
	var on_error   = obj.error;
	connections++;
	http.get({
	    "url" : url
	}, function (error, resp) {
	    if (resp !== undefined && error == null && on_success !== undefined) {
		on_success(JSON.parse(resp.body));
	    }
	    if (error !== null && on_error !== undefined) {
		on_error(error);
	    }
	});
	// d3.json (url, function (error, resp) {
	//     connections--;
	//     if (resp !== undefined && error === null && on_success !== undefined) {
	// 	on_success(resp);
	//     }
	//     if (error !== null && on_error !== undefined) {
	// 	on_error(error);
	//     }
	// });
    });


    eRest.url = {};
    var url_api = apijs (eRest.url);
	/** eRest.url.<strong>region</strong> returns the ensembl REST url to retrieve the genes included in the specified region
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species : The species the region refers to</li>
<li>chr     : The chr (or seq_region name)</li>
<li>from    : The start position of the region in the chr</li>
<li>to      : The end position of the region (from < to always)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/feature/region/homo_sapiens/13:32889611-32973805.json?feature=gene|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.region ({ species : "homo_sapiens", chr : "13", from : 32889611, to : 32973805 }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('region', function(obj) {
	return prefix_region +
	    obj.species +
	    "/" +
	    obj.chr +
	    ":" + 
	    obj.from + 
	    "-" + obj.to + 
	    ".json?feature=gene";
    });

	/** eRest.url.<strong>species_gene</strong> returns the ensembl REST url to retrieve the ensembl gene associated with
	    the given name in the specified species.
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species   : The species the region refers to</li>
<li>gene_name : The name of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/xrefs/symbol/human/BRCA2.json?object_type=gene|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.species_gene ({ species : "human", gene_name : "BRCA2" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('xref', function (obj) {
	return prefix_xref +
	    obj.species  +
	    "/" +
	    obj.name +
	    ".json?object_type=gene";
    });

	/** eRest.url.<strong>homologues</strong> returns the ensembl REST url to retrieve the homologues (orthologues + paralogues) of the given ensembl ID.
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>id : The Ensembl ID of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/homology/id/ENSG00000139618.json?format=condensed;sequence=none;type=all|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.homologues ({ id : "ENSG00000139618" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('homologues', function(obj) {
	return prefix_homologues +
	    obj.id + 
	    ".json?format=condensed;sequence=none;type=all";
    });

	/** eRest.url.<strong>gene</strong> returns the ensembl REST url to retrieve the ensembl gene associated with
	    the given ID
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>id : The name of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/lookup/ENSG00000139618.json?format=full|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.gene ({ id : "ENSG00000139618" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('gene', function(obj) {
	return prefix_ensgene +
	    obj.id +
	    ".json?format=full";
    });

	/** eRest.url.<strong>chr_info</strong> returns the ensembl REST url to retrieve the information associated with the chromosome (seq_region in Ensembl nomenclature).
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species : The species the chr (or seq_region) belongs to
<li>chr     : The name of the chr (or seq_region)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/assembly/info/homo_sapiens/13.json?format=full|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.chr_info ({ species : "homo_sapiens", chr : "13" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('chr_info', function(obj) {
	return prefix_chr_info +
	    obj.species +
	    "/" +
	    obj.chr +
	    ".json?format=full";
    });

	// TODO: For now, it only works with species_set and not species_set_groups
	// Should be extended for wider use
    url_api.method ('aln_block', function (obj) {
	var url = prefix_aln_region + 
	    obj.species +
	    "/" +
	    obj.chr +
	    ":" +
	    obj.from +
	    "-" +
	    obj.to +
	    ".json?method=" +
	    obj.method;

	for (var i=0; i<obj.species_set.length; i++) {
	    url += "&species_set=" + obj.species_set[i];
	}

	return url;
    });

    url_api.method ('gene_tree', function (obj) {
	return prefix_gene_tree +
	    obj.id + 
	    ".json?sequence=" +
	    ((obj.sequence || obj.aligned) ? 1 : "none") +
	    (obj.aligned ? '&aligned=1' : '');
    });

    url_api.method('assembly', function (obj) {
	return prefix_assembly + 
	    obj.species +
	    ".json";
    });


    api.method ('connections', function() {
	return connections;
    });

    return eRest;
};

module.exports = exports = tnt_eRest;

},{"httpplease":14,"tnt.api":22}],25:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":28}],26:[function(require,module,exports){
module.exports=require(3)
},{"./src/api.js":27}],27:[function(require,module,exports){
module.exports=require(4)
},{}],28:[function(require,module,exports){
var apijs = require("tnt.api");

var tooltip = function () {
    "use strict";

    var drag = d3.behavior.drag();
    var tooltip_div;

    var conf = {
	background_color : "white",
	foreground_color : "black",
	position : "right",
	allow_drag : true,
	show_closer : true,
	fill : function () { throw "fill is not defined in the base object"; },
	width : 180,
	id : 1
    };

    var t = function (data, event) {
	drag
	    .origin(function(){
		return {x:parseInt(d3.select(this).style("left")),
			y:parseInt(d3.select(this).style("top"))
		       };
	    })
	    .on("drag", function() {
		if (conf.allow_drag) {
		    d3.select(this)
			.style("left", d3.event.x + "px")
			.style("top", d3.event.y + "px");
		}
	    });

	// TODO: Why do we need the div element?
	// It looks like if we anchor the tooltip in the "body"
	// The tooltip is not located in the right place (appears at the bottom)
	// See clients/tooltips_test.html for an example
	var containerElem = selectAncestor (this, "div");
	if (containerElem === undefined) {
	    // We require a div element at some point to anchor the tooltip
	    return;
	}

	// Container element position (needed for "relative" positioned parents)
	var elemPos = containerElem.getBoundingClientRect();
	var elemTop = elemPos.top + document.body.scrollTop;
	var elemLeft = elemPos.left + document.body.scrollLeft;
	
	tooltip_div = d3.select(containerElem)
	    .append("div")
	    .attr("class", "tnt_tooltip")
	    .classed("tnt_tooltip_active", true)  // TODO: Is this needed/used???
	    .call(drag);

	// prev tooltips with the same header
	d3.select("#tnt_tooltip_" + conf.id).remove();

	if ((d3.event === null) && (event)) {
	    d3.event = event;
	}
	var mouse = [d3.event.pageX, d3.event.pageY];
	d3.event = null;

	var offset = 0;
	if (conf.position === "left") {
	    offset = conf.width;
	}
	
	tooltip_div.attr("id", "tnt_tooltip_" + conf.id);
	
	// We place the tooltip
	tooltip_div
	    .style("left", (mouse[0] - offset - elemLeft) + "px")
	    .style("top", mouse[1] - elemTop + "px");

	// Close
	if (conf.show_closer) {
	    tooltip_div.append("span")
		.style("position", "absolute")
		.style("right", "-10px")
		.style("top", "-10px")
		.append("img")
		.attr("src", tooltip.images.close)
		.attr("width", "20px")
		.attr("height", "20px")
		.on("click", function () {
		    t.close();
		});
	}

	conf.fill.call(tooltip_div, data);

	// return this here?
	return t;
    };

    // gets the first ancestor of elem having tagname "type"
    // example : var mydiv = selectAncestor(myelem, "div");
    function selectAncestor (elem, type) {
	type = type.toLowerCase();
	if (elem.parentNode === null) {
	    console.log("No more parents");
	    return undefined;
	}
	var tagName = elem.parentNode.tagName;

	if ((tagName !== undefined) && (tagName.toLowerCase() === type)) {
	    return elem.parentNode;
	} else {
	    return selectAncestor (elem.parentNode, type);
	}
    }
    
    var api = apijs(t)
	.getset(conf);
    api.check('position', function (val) {
	return (val === 'left') || (val === 'right');
    }, "Only 'left' or 'right' values are allowed for position");

    api.method('close', function () {
	tooltip_div.remove();
    });

    return t;
};

tooltip.table = function () {
    // table tooltips are based on general tooltips
    var t = tooltip();
    
    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .attr("colspan", 2)
	    .text(obj.header);

	// Tooltip rows
	var table_rows = obj_info_table.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("th")
	    .html(function(d,i) {
		return obj.rows[i].label;
	    });

	table_rows
	    .append("td")
	    .html(function(d,i) {
		return obj.rows[i].value;
	    })
	    .each(function (d) {
		if (d.link === undefined) {
		    return;
		}
		d3.select(this)
		    .classed("link", 1)
		    .on('click', function (d) {
			d.link(d.obj);
			t.close.call(this);
		    });
	    });
    });

    return t;
};

tooltip.plain = function () {
    // plain tooltips are based on general tooltips
    var t = tooltip();

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_header")
	    .append("th")
	    .text(obj.header);

	obj_info_table
	    .append("tr")
	    .attr("class", "tnt_zmenu_row")
	    .append("td")
	    .style("text-align", "center")
	    .html(obj.body);
    });

    return t;
};

// TODO: This shouldn't be exposed in the API. It would be better to have as a local variable
// or alternatively have the images somewhere else (although the number of hardcoded images should be left at a minimum)
tooltip.images = {};
tooltip.images.close = 'data:image/png;base64,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';

module.exports = exports = tooltip;

},{"tnt.api":26}],29:[function(require,module,exports){
module.exports = tnt_utils = require("./src/index.js");

},{"./src/index.js":30}],30:[function(require,module,exports){
// require('fs').readdirSync(__dirname + '/').forEach(function(file) {
//     if (file.match(/.+\.js/g) !== null && file !== __filename) {
// 	var name = file.replace('.js', '');
// 	module.exports[name] = require('./' + file);
//     }
// });

// Same as
var utils = require("./utils.js");
utils.reduce = require("./reduce.js");
module.exports = exports = utils;

},{"./reduce.js":31,"./utils.js":32}],31:[function(require,module,exports){
var reduce = function () {
    var smooth = 5;
    var value = 'val';
    var redundant = function (a, b) {
	if (a < b) {
	    return ((b-a) <= (b * 0.2));
	}
	return ((a-b) <= (a * 0.2));
    };
    var perform_reduce = function (arr) {return arr;};

    var reduce = function (arr) {
	if (!arr.length) {
	    return arr;
	}
	var smoothed = perform_smooth(arr);
	var reduced  = perform_reduce(smoothed);
	return reduced;
    };

    var median = function (v, arr) {
	arr.sort(function (a, b) {
	    return a[value] - b[value];
	});
	if (arr.length % 2) {
	    v[value] = arr[~~(arr.length / 2)][value];	    
	} else {
	    var n = ~~(arr.length / 2) - 1;
	    v[value] = (arr[n][value] + arr[n+1][value]) / 2;
	}

	return v;
    };

    var clone = function (source) {
	var target = {};
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
		target[prop] = source[prop];
	    }
	}
	return target;
    };

    var perform_smooth = function (arr) {
	if (smooth === 0) { // no smooth
	    return arr;
	}
	var smooth_arr = [];
	for (var i=0; i<arr.length; i++) {
	    var low = (i < smooth) ? 0 : (i - smooth);
	    var high = (i > (arr.length - smooth)) ? arr.length : (i + smooth);
	    smooth_arr[i] = median(clone(arr[i]), arr.slice(low,high+1));
	}
	return smooth_arr;
    };

    reduce.reducer = function (cbak) {
	if (!arguments.length) {
	    return perform_reduce;
	}
	perform_reduce = cbak;
	return reduce;
    };

    reduce.redundant = function (cbak) {
	if (!arguments.length) {
	    return redundant;
	}
	redundant = cbak;
	return reduce;
    };

    reduce.value = function (val) {
	if (!arguments.length) {
	    return value;
	}
	value = val;
	return reduce;
    };

    reduce.smooth = function (val) {
	if (!arguments.length) {
	    return smooth;
	}
	smooth = val;
	return reduce;
    };

    return reduce;
};

var block = function () {
    var red = reduce()
	.value('start');

    var value2 = 'end';

    var join = function (obj1, obj2) {
        return {
            'object' : {
                'start' : obj1.object[red.value()],
                'end'   : obj2[value2]
            },
            'value'  : obj2[value2]
        };
    };

    // var join = function (obj1, obj2) { return obj1 };

    red.reducer( function (arr) {
	var value = red.value();
	var redundant = red.redundant();
	var reduced_arr = [];
	var curr = {
	    'object' : arr[0],
	    'value'  : arr[0][value2]
	};
	for (var i=1; i<arr.length; i++) {
	    if (redundant (arr[i][value], curr.value)) {
		curr = join(curr, arr[i]);
		continue;
	    }
	    reduced_arr.push (curr.object);
	    curr.object = arr[i];
	    curr.value = arr[i].end;
	}
	reduced_arr.push(curr.object);

	// reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    reduce.join = function (cbak) {
	if (!arguments.length) {
	    return join;
	}
	join = cbak;
	return red;
    };

    reduce.value2 = function (field) {
	if (!arguments.length) {
	    return value2;
	}
	value2 = field;
	return red;
    };

    return red;
};

var line = function () {
    var red = reduce();

    red.reducer ( function (arr) {
	var redundant = red.redundant();
	var value = red.value();
	var reduced_arr = [];
	var curr = arr[0];
	for (var i=1; i<arr.length-1; i++) {
	    if (redundant (arr[i][value], curr[value])) {
		continue;
	    }
	    reduced_arr.push (curr);
	    curr = arr[i];
	}
	reduced_arr.push(curr);
	reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    return red;

};

module.exports = reduce;
module.exports.line = line;
module.exports.block = block;


},{}],32:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
	var tick;

	var defer_cancel = function () {
	    clearTimeout(tick);
	    tick = setTimeout(cbak, time);
	};

	return defer_cancel;
    }
};

},{}],33:[function(require,module,exports){
var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

// A predefined track for genes
var data_gene = function () {
//board.track.data.gene = function () {

    var track = board.track.data();
    // .index("ID");

    var updater = board.track.data.retriever.ensembl()
        .endpoint("region")
    // TODO: If success is defined here, means that it can't be user-defined
    // is that good? enough? API?
    // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
        .success(function(genes) {
	    for (var i = 0; i < genes.length; i++) {
		if (genes[i].strand === -1) {
		    genes[i].display_label = "<" + genes[i].external_name;
		} else {
		    genes[i].display_label = genes[i].external_name + ">";
		}
	    }
	});

    return track.update(updater);
}

module.exports = exports = data_gene;

},{"tnt.api":3,"tnt.board":5,"tnt.ensembl":12}],34:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");
var board = require("tnt.board");

tnt_feature_gene = function () {

    // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
	.layout(board.track.layout.feature())
	.index(function (d) {
	    return d.id;
	});

    // var tooltip = function () {
    //     var tooltip = board.tooltip.table();
    //     var gene_tooltip = function(gene) {
    //         var obj = {};
    //         obj.header = {
    //             label : "HGNC Symbol",
    //             value : gene.external_name
    //         };
    //         obj.rows = [];
    //         obj.rows.push( {
    //             label : "Name",
    //             value : "<a href=''>" + gene.ID  + "</a>"
    //         });
    //         obj.rows.push( {
    //             label : "Gene Type",
    //             value : gene.biotype
    //         });
    //         obj.rows.push( {
    //             label : "Location",
    //             value : "<a href=''>" + gene.seq_region_name + ":" + gene.start + "-" + gene.end  + "</a>"
    //         });
    //         obj.rows.push( {
    //             label : "Strand",
    //             value : (gene.strand === 1 ? "Forward" : "Reverse")
    //         });
    //         obj.rows.push( {
    //             label : "Description",
    //             value : gene.description
    //         });

    //         tooltip.call(this, obj);
    //     };

    //     return gene_tooltip;
    // };


    feature.create(function (new_elems, xScale) {
	var track = this;

	new_elems
	    .append("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("y", function (d) {
		return feature.layout().gene_slot().slot_height * d.slot;
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", feature.layout().gene_slot().gene_height)
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
		if (d.color === undefined) {
		    return feature.foreground_color();
		} else {
		    return d.color
		}
	    });

	new_elems
	    .append("text")
	    .attr("class", "tnt_name")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot) + 25;
	    })
	    .attr("fill", track.background_color())
	    .text(function (d) {
		if (feature.layout().gene_slot().show_label) {
		    return d.display_label
		} else {
		    return ""
		}
	    })
	    .style("font-weight", "normal")
	    .transition()
	    .duration(500)
	    .attr("fill", function() {
		return feature.foreground_color();
	    });	    
    });

    feature.updater(function (genes) {
	var track = this;
	genes
	    .select("rect")
	    .transition()
	    .duration(500)
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot);
	    })
	    .attr("height", feature.layout().gene_slot().gene_height);

	genes
	    .select("text")
	    .transition()
	    .duration(500)
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot) + 25;
	    })
	    .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
		    return d.display_label;
                } else {
		    return "";
                }
	    });
    });

    feature.mover(function (genes, xScale) {
	genes.select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });

	genes.select("text")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
    });

    // apijs (feature)
    // 	.method ({
    // 	    tooltip : tooltip
    // 	});


    return feature;
};

module.exports = exports = tnt_feature_gene;

},{"./layout.js":37,"tnt.api":3,"tnt.board":5}],35:[function(require,module,exports){
var tnt_rest = require("tnt.ensembl");
var apijs = require("tnt.api");
var tnt_board = require("tnt.board");
tnt_board.track.layout.gene = require("./layout.js");
tnt_board.track.feature.gene = require("./feature.js");

tnt_board_genome = function() {
    "use strict"

    // Private vars
    var ens_re = /^ENS\w+\d+$/;
    var eRest = tnt_rest();
    var chr_length;
    
    // Vars exposed in the API
    var conf = {
	gene           : undefined,
	xref_search    : function () {},
	ensgene_search : function () {},
	context        : 0
    };

    var gene;
    var limits = {
        left : 0,
	right : undefined,
	zoom_out : eRest.limits.region,
	zoom_in  : 200
    };


    // We "inherit" from board
    var genome_browser = tnt_board();

    // The location and axis track
    var location_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.data(tnt_board.track.data.empty())
	.display(tnt_board.track.feature.location());

    var axis_track = tnt_board.track()
	.height(20)
	.background_color("white")
	.data(tnt_board.track.data.empty())
	.display(tnt_board.track.feature.axis());

    genome_browser
	.add_track(location_track)
	.add_track(axis_track);

    // Default location:
    genome_browser
	.species("human")
	.chr(7)
	.from(139424940)
	.to(141784100);

    // We save the start method of the 'parent' object
    genome_browser._start = genome_browser.start;

    // We hijack parent's start method
    var start = function (where) {
	if (where !== undefined) {
	    if (where.gene !== undefined) {
		get_gene(where);
		return;
	    } else {
		if (where.species === undefined) {
		    where.species = genome_browser.species();
		} else {
		    genome_browser.species(where.species);
		}
		if (where.chr === undefined) {
		    where.chr = genome_browser.chr();
		} else {
		    genome_browser.chr(where.chr);
		}
		if (where.from === undefined) {
		    where.from = genome_browser.from();
		} else {
		    genome_browser.from(where.from)
		}
		if (where.to === undefined) {
		    where.to = genome_browser.to();
		} else {
		    genome_browser.to(where.to);
		}
	    }
	} else { // "where" is undef so look for gene or loc
	    if (genome_browser.gene() !== undefined) {
		get_gene({ species : genome_browser.species(),
			   gene    : genome_browser.gene()
			 });
		return;
	    } else {
		where = {};
		where.species = genome_browser.species(),
		where.chr     = genome_browser.chr(),
		where.from    = genome_browser.from(),
		where.to      = genome_browser.to()
	    }
	}

	genome_browser.right (function (done) {
	    // Get the chromosome length and use it as the 'right' limit

	    genome_browser.zoom_in (limits.zoom_in);
	    genome_browser.zoom_out (limits.zoom_out);

	    eRest.call({url : eRest.url.chr_info ({species : where.species,
						   chr     : where.chr
						  }),
			success : function (resp) {
			    done(resp.length);
			}
		       });
	});
	genome_browser._start();
    };

     var homologues = function (ensGene, callback)  {
	eRest.call({url : eRest.url.homologues ({id : ensGene}),
		    success : function(resp) {
			var homologues = resp.data[0].homologies;
			if (callback !== undefined) {
			    var homologues_obj = split_homologues(homologues)
			    callback(homologues_obj);
			}
		    }
		   });
    }

    var isEnsemblGene = function(term) {
	if (term.match(ens_re)) {
            return true;
        } else {
            return false;
        }
    };

    var get_gene = function (where) {
	if (isEnsemblGene(where.gene)) {
	    get_ensGene(where.gene)
	} else {
	    eRest.call({url : eRest.url.xref ({ species : where.species,
						name    : where.gene 
					      }
					     ),
			success : function(resp) {
			    resp = resp.filter(function(d) {
				return !d.id.indexOf("ENS");
			    });
			    if (resp[0] !== undefined) {
				conf.xref_search(resp);
				get_ensGene(resp[0].id)
			    } else {
				genome_browser.start();
			    }
			}
		       }
		      );
	}
    };

    var get_ensGene = function (id) {
	eRest.call({url     : eRest.url.gene ({id : id}),
		    success : function(resp) {
			conf.ensgene_search(resp);

			var extra = ~~((resp.end - resp.start) * (conf.context/100));
			genome_browser
			    .species(resp.species)
			    .chr(resp.seq_region_name)
			    .from(resp.start - extra)
			    .to(resp.end + extra);

			genome_browser.start( { species : resp.species,
					  chr     : resp.seq_region_name,
					  from    : resp.start - extra,
					  to      : resp.end + extra
					} );
		    }
		   });
    };

    var split_homologues = function (homologues) {
	var orthoPatt = /ortholog/;
	var paraPatt = /paralog/;

	var orthologues = homologues.filter(function(d){return d.type.match(orthoPatt)});
	var paralogues  = homologues.filter(function(d){return d.type.match(paraPatt)});

	return {'orthologues' : orthologues,
		'paralogues'  : paralogues};
    };

    var api = apijs(genome_browser)
	.getset (conf);

    api.method ({
	start      : start,
	homologues : homologues
    });

    return genome_browser;
};

module.exports = exports = tnt_board_genome;

},{"./feature.js":34,"./layout.js":37,"tnt.api":3,"tnt.board":5,"tnt.ensembl":12}],36:[function(require,module,exports){
var board = require("tnt.board");
board.genome = require("./genome");
board.track.layout.feature = require("./layout");
board.track.feature.gene = require("./feature");
board.track.data.gene = require("./data");

module.exports = exports = board;

},{"./data":33,"./feature":34,"./genome":35,"./layout":37,"tnt.board":5}],37:[function(require,module,exports){
var apijs = require ("tnt.api");

// The overlap detector used for genes
var gene_layout = function() {
    // Private vars
    var max_slots;

    // vars exposed in the API:
    var conf = {
	height   : 150,
	scale    : undefined
    };

    var conf_ro = {
	elements : []
    };

    var slot_types = {
	'expanded'   : {
	    slot_height : 30,
	    gene_height : 10,
	    show_label  : true
	},
	'collapsed' : {
	    slot_height : 10,
	    gene_height : 7,
	    show_label  : false
	}
    };
    var current_slot_type = 'expanded';

    // The returned closure / object
    var genes_layout = function (new_genes, scale) {

	// We make sure that the genes have name
	for (var i = 0; i < new_genes.length; i++) {
	    if (new_genes[i].external_name === null) {
		new_genes[i].external_name = "";
	    }
	}

	max_slots = ~~(conf.height / slot_types.expanded.slot_height) - 1;

	if (scale !== undefined) {
	    genes_layout.scale(scale);
	}

	slot_keeper(new_genes, conf_ro.elements);
	var needed_slots = collition_detector(new_genes);
	if (needed_slots > max_slots) {
	    current_slot_type = 'collapsed';
	} else {
	    current_slot_type = 'expanded';
	}

	conf_ro.elements = new_genes;
    };

    var gene_slot = function () {
	return slot_types[current_slot_type];
    };

    var collition_detector = function (genes) {
	var genes_placed = [];
	var genes_to_place = genes;
	var needed_slots = 0;
	for (var i = 0; i < genes.length; i++) {
            if (genes[i].slot > needed_slots && genes[i].slot < max_slots) {
		needed_slots = genes[i].slot
            }
	}

	for (var i = 0; i < genes_to_place.length; i++) {
            var genes_by_slot = sort_genes_by_slot(genes_placed);
	    var this_gene = genes_to_place[i];
	    if (this_gene.slot !== undefined && this_gene.slot < max_slots) {
		if (slot_has_space(this_gene, genes_by_slot[this_gene.slot])) {
		    genes_placed.push(this_gene);
		    continue;
		}
	    }
            var slot = 0;
            OUTER: while (true) {
		if (slot_has_space(this_gene, genes_by_slot[slot])) {
		    this_gene.slot = slot;
		    genes_placed.push(this_gene);
		    if (slot > needed_slots) {
			needed_slots = slot;
		    }
		    break;
		}
		slot++;
	    }
	}
	return needed_slots + 1;
    };

    var slot_has_space = function (query_gene, genes_in_this_slot) {
	if (genes_in_this_slot === undefined) {
	    return true;
	}
	for (var j = 0; j < genes_in_this_slot.length; j++) {
            var subj_gene = genes_in_this_slot[j];
	    if (query_gene.id === subj_gene.id) {
		continue;
	    }
            var y_label_end = subj_gene.display_label.length * 8 + conf.scale(subj_gene.start); // TODO: It may be better to have a fixed font size (instead of the hardcoded 16)?
            var y1  = conf.scale(subj_gene.start);
            var y2  = conf.scale(subj_gene.end) > y_label_end ? conf.scale(subj_gene.end) : y_label_end;
	    var x_label_end = query_gene.display_label.length * 8 + conf.scale(query_gene.start);
            var x1 = conf.scale(query_gene.start);
            var x2 = conf.scale(query_gene.end) > x_label_end ? conf.scale(query_gene.end) : x_label_end;
            if ( ((x1 < y1) && (x2 > y1)) ||
		 ((x1 > y1) && (x1 < y2)) ) {
		return false;
            }
	}
	return true;
    };

    var slot_keeper = function (genes, prev_genes) {
	var prev_genes_slots = genes2slots(prev_genes);

	for (var i = 0; i < genes.length; i++) {
            if (prev_genes_slots[genes[i].id] !== undefined) {
		genes[i].slot = prev_genes_slots[genes[i].id];
            }
	}
    };

    var genes2slots = function (genes_array) {
	var hash = {};
	for (var i = 0; i < genes_array.length; i++) {
            var gene = genes_array[i];
            hash[gene.id] = gene.slot;
	}
	return hash;
    }

    var sort_genes_by_slot = function (genes) {
	var slots = [];
	for (var i = 0; i < genes.length; i++) {
            if (slots[genes[i].slot] === undefined) {
		slots[genes[i].slot] = [];
            }
            slots[genes[i].slot].push(genes[i]);
	}
	return slots;
    };

    // API
    var api = apijs (genes_layout)
	.getset (conf)
	.get (conf_ro)
	.method ({
	    gene_slot : gene_slot
	});

    return genes_layout;
};

module.exports = exports = gene_layout;

},{"tnt.api":3}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL2Zha2VfZTFiMzg2YzIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9ib2FyZC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2RhdGEuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy90cmFjay5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvZXJyb3IuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXNwb25zZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvdXRpbHMvZGVsYXkuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3V0aWxzL29uY2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3hoci1icm93c2VyLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2NsZWFudXJsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL3NyYy9yZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL3NyYy90b29sdGlwLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvcmVkdWNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvc3JjL2dlbm9tZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9sYXlvdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTs7Ozs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge307XG59XG50bnQuZ2Vub21lID0gcmVxdWlyZShcIi4vaW5kZXguanNcIik7XG50bnQudXRpbHMgPSByZXF1aXJlKFwidG50LnV0aWxzXCIpO1xudG50LmJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbnRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuXG4vL21vZHVsZS5leHBvcnRzID0gdG50X2dlbm9tZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuIiwiLy8gaWYgKHR5cGVvZiB0bnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbi8vICAgICBtb2R1bGUuZXhwb3J0cyA9IHRudCA9IHt9XG4vLyB9XG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvYXBpLmpzXCIpO1xuIiwidmFyIGFwaSA9IGZ1bmN0aW9uICh3aG8pIHtcblxuICAgIHZhciBfbWV0aG9kcyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIG0gPSBbXTtcblxuXHRtLmFkZF9iYXRjaCA9IGZ1bmN0aW9uIChvYmopIHtcblx0ICAgIG0udW5zaGlmdChvYmopO1xuXHR9O1xuXG5cdG0udXBkYXRlID0gZnVuY3Rpb24gKG1ldGhvZCwgdmFsdWUpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdG1baV1bcF0gPSB2YWx1ZTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cdG0uYWRkID0gZnVuY3Rpb24gKG1ldGhvZCwgdmFsdWUpIHtcblx0ICAgIGlmIChtLnVwZGF0ZSAobWV0aG9kLCB2YWx1ZSkgKSB7XG5cdCAgICB9IGVsc2Uge1xuXHRcdHZhciByZWcgPSB7fTtcblx0XHRyZWdbbWV0aG9kXSA9IHZhbHVlO1xuXHRcdG0uYWRkX2JhdGNoIChyZWcpO1xuXHQgICAgfVxuXHR9O1xuXG5cdG0uZ2V0ID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG0ubGVuZ3RoOyBpKyspIHtcblx0XHRmb3IgKHZhciBwIGluIG1baV0pIHtcblx0XHQgICAgaWYgKHAgPT09IG1ldGhvZCkge1xuXHRcdFx0cmV0dXJuIG1baV1bcF07XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdH07XG5cblx0cmV0dXJuIG07XG4gICAgfTtcblxuICAgIHZhciBtZXRob2RzICAgID0gX21ldGhvZHMoKTtcbiAgICB2YXIgYXBpID0gZnVuY3Rpb24gKCkge307XG5cbiAgICBhcGkuY2hlY2sgPSBmdW5jdGlvbiAobWV0aG9kLCBjaGVjaywgbXNnKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS5jaGVjayhtZXRob2RbaV0sIGNoZWNrLCBtc2cpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0aWYgKHR5cGVvZiAobWV0aG9kKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbWV0aG9kLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9IGVsc2Uge1xuXHQgICAgd2hvW21ldGhvZF0uY2hlY2soY2hlY2ssIG1zZyk7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChtZXRob2QsIGNiYWspIHtcblx0aWYgKG1ldGhvZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bWV0aG9kLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBpLnRyYW5zZm9ybSAobWV0aG9kW2ldLCBjYmFrKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC50cmFuc2Zvcm0gKGNiYWspO1xuXHR9IGVsc2Uge1xuXHQgICAgd2hvW21ldGhvZF0udHJhbnNmb3JtKGNiYWspO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIHZhciBhdHRhY2hfbWV0aG9kID0gZnVuY3Rpb24gKG1ldGhvZCwgb3B0cykge1xuXHR2YXIgY2hlY2tzID0gW107XG5cdHZhciB0cmFuc2Zvcm1zID0gW107XG5cblx0dmFyIGdldHRlciA9IG9wdHMub25fZ2V0dGVyIHx8IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBtZXRob2RzLmdldChtZXRob2QpO1xuXHR9O1xuXG5cdHZhciBzZXR0ZXIgPSBvcHRzLm9uX3NldHRlciB8fCBmdW5jdGlvbiAoeCkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYW5zZm9ybXMubGVuZ3RoOyBpKyspIHtcblx0XHR4ID0gdHJhbnNmb3Jtc1tpXSh4KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgaj0wOyBqPGNoZWNrcy5sZW5ndGg7IGorKykge1xuXHRcdGlmICghY2hlY2tzW2pdLmNoZWNrKHgpKSB7XG5cdFx0ICAgIHZhciBtc2cgPSBjaGVja3Nbal0ubXNnIHx8IFxuXHRcdFx0KFwiVmFsdWUgXCIgKyB4ICsgXCIgZG9lc24ndCBzZWVtIHRvIGJlIHZhbGlkIGZvciB0aGlzIG1ldGhvZFwiKTtcblx0XHQgICAgdGhyb3cgKG1zZyk7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgbWV0aG9kcy5hZGQobWV0aG9kLCB4KTtcblx0fTtcblxuXHR2YXIgbmV3X21ldGhvZCA9IGZ1bmN0aW9uIChuZXdfdmFsKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZ2V0dGVyKCk7XG5cdCAgICB9XG5cdCAgICBzZXR0ZXIobmV3X3ZhbCk7XG5cdCAgICByZXR1cm4gd2hvOyAvLyBSZXR1cm4gdGhpcz9cblx0fTtcblx0bmV3X21ldGhvZC5jaGVjayA9IGZ1bmN0aW9uIChjYmFrLCBtc2cpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBjaGVja3M7XG5cdCAgICB9XG5cdCAgICBjaGVja3MucHVzaCAoe2NoZWNrIDogY2Jhayxcblx0XHRcdCAgbXNnICAgOiBtc2d9KTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHR9O1xuXHRuZXdfbWV0aG9kLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdHJhbnNmb3Jtcztcblx0ICAgIH1cblx0ICAgIHRyYW5zZm9ybXMucHVzaChjYmFrKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdHdob1ttZXRob2RdID0gbmV3X21ldGhvZDtcbiAgICB9O1xuXG4gICAgdmFyIGdldHNldCA9IGZ1bmN0aW9uIChwYXJhbSwgb3B0cykge1xuXHRpZiAodHlwZW9mIChwYXJhbSkgPT09ICdvYmplY3QnKSB7XG5cdCAgICBtZXRob2RzLmFkZF9iYXRjaCAocGFyYW0pO1xuXHQgICAgZm9yICh2YXIgcCBpbiBwYXJhbSkge1xuXHRcdGF0dGFjaF9tZXRob2QgKHAsIG9wdHMpO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgbWV0aG9kcy5hZGQgKHBhcmFtLCBvcHRzLmRlZmF1bHRfdmFsdWUpO1xuXHQgICAgYXR0YWNoX21ldGhvZCAocGFyYW0sIG9wdHMpO1xuXHR9XG4gICAgfTtcblxuICAgIGFwaS5nZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmfSk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLmdldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdHZhciBvbl9zZXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aHJvdyAoXCJNZXRob2QgZGVmaW5lZCBvbmx5IGFzIGEgZ2V0dGVyICh5b3UgYXJlIHRyeWluZyB0byB1c2UgaXQgYXMgYSBzZXR0ZXJcIik7XG5cdH07XG5cblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZixcblx0XHQgICAgICAgb25fc2V0dGVyIDogb25fc2V0dGVyfVxuXHQgICAgICApO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5zZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fZ2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIHNldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgZ2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX2dldHRlciA6IG9uX2dldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkubWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGNiYWspIHtcblx0aWYgKHR5cGVvZiAobmFtZSkgPT09ICdvYmplY3QnKSB7XG5cdCAgICBmb3IgKHZhciBwIGluIG5hbWUpIHtcblx0XHR3aG9bcF0gPSBuYW1lW3BdO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgd2hvW25hbWVdID0gY2Jhaztcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICByZXR1cm4gYXBpO1xuICAgIFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYXBpOyIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxuLy8gdG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbi8vIHRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuLy8gdG50LmJvYXJkID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJvYXJkID0gcmVxdWlyZShcIi4vc3JjL2luZGV4XCIpO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGRlZmVyQ2FuY2VsID0gcmVxdWlyZSAoXCJ0bnQudXRpbHNcIikuZGVmZXJfY2FuY2VsO1xuXG52YXIgYm9hcmQgPSBmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBcbiAgICAvLy8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBzdmc7XG4gICAgdmFyIGRpdl9pZDtcbiAgICB2YXIgdHJhY2tzID0gW107XG4gICAgdmFyIG1pbl93aWR0aCA9IDUwO1xuICAgIHZhciBoZWlnaHQgICAgPSAwOyAgICAvLyBUaGlzIGlzIHRoZSBnbG9iYWwgaGVpZ2h0IGluY2x1ZGluZyBhbGwgdGhlIHRyYWNrc1xuICAgIHZhciB3aWR0aCAgICAgPSA5MjA7XG4gICAgdmFyIGhlaWdodF9vZmZzZXQgPSAyMDtcbiAgICB2YXIgbG9jID0ge1xuXHRzcGVjaWVzICA6IHVuZGVmaW5lZCxcblx0Y2hyICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgIGZyb20gICAgIDogMCxcbiAgICAgICAgdG8gICAgICAgOiA1MDBcbiAgICB9O1xuXG4gICAgLy8gVE9ETzogV2UgaGF2ZSBub3cgYmFja2dyb3VuZCBjb2xvciBpbiB0aGUgdHJhY2tzLiBDYW4gdGhpcyBiZSByZW1vdmVkP1xuICAgIC8vIEl0IGxvb2tzIGxpa2UgaXQgaXMgdXNlZCBpbiB0aGUgdG9vLXdpZGUgcGFuZSBldGMsIGJ1dCBpdCBtYXkgbm90IGJlIG5lZWRlZCBhbnltb3JlXG4gICAgdmFyIGJnQ29sb3IgICA9IGQzLnJnYignI0Y4RkJFRicpOyAvLyNGOEZCRUZcbiAgICB2YXIgcGFuZTsgLy8gRHJhZ2dhYmxlIHBhbmVcbiAgICB2YXIgc3ZnX2c7XG4gICAgdmFyIHhTY2FsZTtcbiAgICB2YXIgem9vbUV2ZW50SGFuZGxlciA9IGQzLmJlaGF2aW9yLnpvb20oKTtcbiAgICB2YXIgbGltaXRzID0ge1xuXHRsZWZ0IDogMCxcblx0cmlnaHQgOiAxMDAwLFxuXHR6b29tX291dCA6IDEwMDAsXG5cdHpvb21faW4gIDogMTAwXG4gICAgfTtcbiAgICB2YXIgY2FwX3dpZHRoID0gMztcbiAgICB2YXIgZHVyID0gNTAwO1xuICAgIHZhciBkcmFnX2FsbG93ZWQgPSB0cnVlO1xuXG4gICAgdmFyIGV4cG9ydHMgPSB7XG5cdGVhc2UgICAgICAgICAgOiBkMy5lYXNlKFwiY3ViaWMtaW4tb3V0XCIpLFxuXHRleHRlbmRfY2FudmFzIDoge1xuXHQgICAgbGVmdCA6IDAsXG5cdCAgICByaWdodCA6IDBcblx0fSxcblx0c2hvd19mcmFtZSA6IHRydWVcblx0Ly8gbGltaXRzICAgICAgICA6IGZ1bmN0aW9uICgpIHt0aHJvdyBcIlRoZSBsaW1pdHMgbWV0aG9kIHNob3VsZCBiZSBkZWZpbmVkXCJ9XHRcbiAgICB9O1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgdHJhY2tfdmlzID0gZnVuY3Rpb24oZGl2KSB7XG5cdGRpdl9pZCA9IGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKTtcblxuXHQvLyBUaGUgb3JpZ2luYWwgZGl2IGlzIGNsYXNzZWQgd2l0aCB0aGUgdG50IGNsYXNzXG5cdGQzLnNlbGVjdChkaXYpXG5cdCAgICAuY2xhc3NlZChcInRudFwiLCB0cnVlKTtcblxuXHQvLyBUT0RPOiBNb3ZlIHRoZSBzdHlsaW5nIHRvIHRoZSBzY3NzP1xuXHR2YXIgYnJvd3NlckRpdiA9IGQzLnNlbGVjdChkaXYpXG5cdCAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkKVxuXHQgICAgLnN0eWxlKFwicG9zaXRpb25cIiwgXCJyZWxhdGl2ZVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZnJhbWVkXCIsIGV4cG9ydHMuc2hvd19mcmFtZSA/IHRydWUgOiBmYWxzZSlcblx0ICAgIC5zdHlsZShcIndpZHRoXCIsICh3aWR0aCArIGNhcF93aWR0aCoyICsgZXhwb3J0cy5leHRlbmRfY2FudmFzLnJpZ2h0ICsgZXhwb3J0cy5leHRlbmRfY2FudmFzLmxlZnQpICsgXCJweFwiKVxuXG5cdHZhciBncm91cERpdiA9IGJyb3dzZXJEaXZcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ3JvdXBEaXZcIik7XG5cblx0Ly8gVGhlIFNWR1xuXHRzdmcgPSBncm91cERpdlxuXHQgICAgLmFwcGVuZChcInN2Z1wiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9zdmdcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG5cdCAgICAuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpO1xuXG5cdHN2Z19nID0gc3ZnXG5cdCAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwyMClcIilcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2dcIik7XG5cblx0Ly8gY2Fwc1xuXHRzdmdfZ1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdCAgICAuYXR0cihcInlcIiwgMClcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgMClcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBcInJlZFwiKTtcblx0c3ZnX2dcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfM3BjYXBcIilcblx0ICAgIC5hdHRyKFwieFwiLCB3aWR0aC1jYXBfd2lkdGgpXG5cdCAgICAuYXR0cihcInlcIiwgMClcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgMClcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBcInJlZFwiKTtcblxuXHQvLyBUaGUgWm9vbWluZy9QYW5uaW5nIFBhbmVcblx0cGFuZSA9IHN2Z19nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9wYW5lXCIpXG5cdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfcGFuZVwiKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgYmdDb2xvcik7XG5cblx0Ly8gKiogVE9ETzogV291bGRuJ3QgYmUgYmV0dGVyIHRvIGhhdmUgdGhlc2UgbWVzc2FnZXMgYnkgdHJhY2s/XG5cdC8vIHZhciB0b29XaWRlX3RleHQgPSBzdmdfZ1xuXHQvLyAgICAgLmFwcGVuZChcInRleHRcIilcblx0Ly8gICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfd2lkZU9LX3RleHRcIilcblx0Ly8gICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl90b29XaWRlXCIpXG5cdC8vICAgICAuYXR0cihcImZpbGxcIiwgYmdDb2xvcilcblx0Ly8gICAgIC50ZXh0KFwiUmVnaW9uIHRvbyB3aWRlXCIpO1xuXG5cdC8vIFRPRE86IEkgZG9uJ3Qga25vdyBpZiB0aGlzIGlzIHRoZSBiZXN0IHdheSAoYW5kIHBvcnRhYmxlKSB3YXlcblx0Ly8gb2YgY2VudGVyaW5nIHRoZSB0ZXh0IGluIHRoZSB0ZXh0IGFyZWFcblx0Ly8gdmFyIGJiID0gdG9vV2lkZV90ZXh0WzBdWzBdLmdldEJCb3goKTtcblx0Ly8gdG9vV2lkZV90ZXh0XG5cdC8vICAgICAuYXR0cihcInhcIiwgfn4od2lkdGgvMiAtIGJiLndpZHRoLzIpKVxuXHQvLyAgICAgLmF0dHIoXCJ5XCIsIH5+KGhlaWdodC8yIC0gYmIuaGVpZ2h0LzIpKTtcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzICh0cmFja192aXMpXG5cdC5nZXRzZXQgKGV4cG9ydHMpXG5cdC5nZXRzZXQgKGxpbWl0cylcblx0LmdldHNldCAobG9jKTtcblxuICAgIGFwaS50cmFuc2Zvcm0gKHRyYWNrX3Zpcy5leHRlbmRfY2FudmFzLCBmdW5jdGlvbiAodmFsKSB7XG5cdHZhciBwcmV2X3ZhbCA9IHRyYWNrX3Zpcy5leHRlbmRfY2FudmFzKCk7XG5cdHZhbC5sZWZ0ID0gdmFsLmxlZnQgfHwgcHJldl92YWwubGVmdDtcblx0dmFsLnJpZ2h0ID0gdmFsLnJpZ2h0IHx8IHByZXZfdmFsLnJpZ2h0O1xuXHRyZXR1cm4gdmFsO1xuICAgIH0pO1xuXG4gICAgLy8gdHJhY2tfdmlzIGFsd2F5cyBzdGFydHMgb24gbG9jLmZyb20gJiBsb2MudG9cbiAgICBhcGkubWV0aG9kICgnc3RhcnQnLCBmdW5jdGlvbiAoKSB7XG5cblx0Ly8gUmVzZXQgdGhlIHRyYWNrc1xuXHRmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAodHJhY2tzW2ldLmcpIHtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnJlc2V0LmNhbGwodHJhY2tzW2ldKTtcblx0ICAgIH1cblx0ICAgIF9pbml0X3RyYWNrKHRyYWNrc1tpXSk7XG5cdH1cblxuXHRfcGxhY2VfdHJhY2tzKCk7XG5cblx0Ly8gVGhlIGNvbnRpbnVhdGlvbiBjYWxsYmFja1xuXHR2YXIgY29udCA9IGZ1bmN0aW9uIChyZXNwKSB7XG5cdCAgICBsaW1pdHMucmlnaHQgPSByZXNwO1xuXG5cdCAgICAvLyB6b29tRXZlbnRIYW5kbGVyLnhFeHRlbnQoW2xpbWl0cy5sZWZ0LCBsaW1pdHMucmlnaHRdKTtcblx0ICAgIGlmICgobG9jLnRvIC0gbG9jLmZyb20pIDwgbGltaXRzLnpvb21faW4pIHtcblx0XHRpZiAoKGxvYy5mcm9tICsgbGltaXRzLnpvb21faW4pID4gbGltaXRzLnpvb21faW4pIHtcblx0XHQgICAgbG9jLnRvID0gbGltaXRzLnJpZ2h0O1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGxvYy50byA9IGxvYy5mcm9tICsgbGltaXRzLnpvb21faW47XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgcGxvdCgpO1xuXG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdFx0X3VwZGF0ZV90cmFjayh0cmFja3NbaV0sIGxvYyk7XG5cdCAgICB9XG5cdH07XG5cblx0Ly8gSWYgbGltaXRzLnJpZ2h0IGlzIGEgZnVuY3Rpb24sIHdlIGhhdmUgdG8gY2FsbCBpdCBhc3luY2hyb25vdXNseSBhbmRcblx0Ly8gdGhlbiBzdGFydGluZyB0aGUgcGxvdCBvbmNlIHdlIGhhdmUgc2V0IHRoZSByaWdodCBsaW1pdCAocGxvdClcblx0Ly8gSWYgbm90LCB3ZSBhc3N1bWUgdGhhdCBpdCBpcyBhbiBvYmpldCB3aXRoIG5ldyAobWF5YmUgcGFydGlhbGx5IGRlZmluZWQpXG5cdC8vIGRlZmluaXRpb25zIG9mIHRoZSBsaW1pdHMgYW5kIHdlIGNhbiBwbG90IGRpcmVjdGx5XG5cdC8vIFRPRE86IFJpZ2h0IG5vdywgb25seSByaWdodCBjYW4gYmUgY2FsbGVkIGFzIGFuIGFzeW5jIGZ1bmN0aW9uIHdoaWNoIGlzIHdlYWtcblx0aWYgKHR5cGVvZiAobGltaXRzLnJpZ2h0KSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbGltaXRzLnJpZ2h0KGNvbnQpO1xuXHR9IGVsc2Uge1xuXHQgICAgY29udChsaW1pdHMucmlnaHQpO1xuXHR9XG5cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7XG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIF91cGRhdGVfdHJhY2sgKHRyYWNrc1tpXSk7XG5cdH1cblxuICAgIH0pO1xuXG4gICAgdmFyIF91cGRhdGVfdHJhY2sgPSBmdW5jdGlvbiAodHJhY2ssIHdoZXJlKSB7XG5cdGlmICh0cmFjay5kYXRhKCkpIHtcblx0ICAgIHZhciBkYXRhX3VwZGF0ZXIgPSB0cmFjay5kYXRhKCkudXBkYXRlKCk7XG5cdCAgICBkYXRhX3VwZGF0ZXIoe1xuXHRcdCdsb2MnIDogd2hlcmUsXG5cdFx0J29uX3N1Y2Nlc3MnIDogZnVuY3Rpb24gKCkge1xuXHRcdCAgICB0cmFjay5kaXNwbGF5KCkudXBkYXRlLmNhbGwodHJhY2ssIHhTY2FsZSk7XG5cdFx0fVxuXHQgICAgfSk7XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIHBsb3QgPSBmdW5jdGlvbigpIHtcblxuXHR4U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuXHQgICAgLmRvbWFpbihbbG9jLmZyb20sIGxvYy50b10pXG5cdCAgICAucmFuZ2UoWzAsIHdpZHRoXSk7XG5cblx0aWYgKGRyYWdfYWxsb3dlZCkge1xuXHQgICAgc3ZnX2cuY2FsbCggem9vbUV2ZW50SGFuZGxlclxuXHRcdCAgICAgICAueCh4U2NhbGUpXG5cdFx0ICAgICAgIC5zY2FsZUV4dGVudChbKGxvYy50by1sb2MuZnJvbSkvKGxpbWl0cy56b29tX291dC0xKSwgKGxvYy50by1sb2MuZnJvbSkvbGltaXRzLnpvb21faW5dKVxuXHRcdCAgICAgICAub24oXCJ6b29tXCIsIF9tb3ZlKVxuXHRcdCAgICAgKTtcblx0fVxuXG4gICAgfTtcblxuICAgIC8vIHJpZ2h0L2xlZnQvem9vbSBwYW5zIG9yIHpvb21zIHRoZSB0cmFjay4gVGhlc2UgbWV0aG9kcyBhcmUgZXhwb3NlZCB0byBhbGxvdyBleHRlcm5hbCBidXR0b25zLCBldGMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgdHJhY2tzLiBUaGUgYXJndW1lbnQgaXMgdGhlIGFtb3VudCBvZiBwYW5uaW5nL3pvb21pbmcgKGllLiAxLjIgbWVhbnMgMjAlIHBhbm5pbmcpIFdpdGggbGVmdC9yaWdodCBvbmx5IHBvc2l0aXZlIG51bWJlcnMgYXJlIGFsbG93ZWQuXG4gICAgYXBpLm1ldGhvZCAoJ21vdmVfcmlnaHQnLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdGlmIChmYWN0b3IgPiAwKSB7XG5cdCAgICBfbWFudWFsX21vdmUoZmFjdG9yLCAxKTtcblx0fVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ21vdmVfbGVmdCcsIGZ1bmN0aW9uIChmYWN0b3IpIHtcblx0aWYgKGZhY3RvciA+IDApIHtcblx0ICAgIF9tYW51YWxfbW92ZShmYWN0b3IsIC0xKTtcblx0fVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3pvb20nLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdF9tYW51YWxfbW92ZShmYWN0b3IsIDApO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2ZpbmRfdHJhY2tfYnlfaWQnLCBmdW5jdGlvbiAoaWQpIHtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHRyYWNrc1tpXS5pZCgpID09PSBpZCkge1xuXHRcdHJldHVybiB0cmFja3NbaV07XG5cdCAgICB9XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdyZW9yZGVyJywgZnVuY3Rpb24gKG5ld190cmFja3MpIHtcblx0Ly8gVE9ETzogVGhpcyBpcyBkZWZpbmluZyBhIG5ldyBoZWlnaHQsIGJ1dCB0aGUgZ2xvYmFsIGhlaWdodCBpcyB1c2VkIHRvIGRlZmluZSB0aGUgc2l6ZSBvZiBzZXZlcmFsXG5cdC8vIHBhcnRzLiBXZSBzaG91bGQgZG8gdGhpcyBkeW5hbWljYWxseVxuXG5cdGZvciAodmFyIGo9MDsgajxuZXdfdHJhY2tzLmxlbmd0aDsgaisrKSB7XG5cdCAgICB2YXIgZm91bmQgPSBmYWxzZTtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAodHJhY2tzW2ldLmlkKCkgPT09IG5ld190cmFja3Nbal0uaWQoKSkge1xuXHRcdCAgICBmb3VuZCA9IHRydWU7XG5cdFx0ICAgIHRyYWNrcy5zcGxpY2UoaSwxKTtcblx0XHQgICAgYnJlYWs7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgaWYgKCFmb3VuZCkge1xuXHRcdF9pbml0X3RyYWNrKG5ld190cmFja3Nbal0pO1xuXHRcdF91cGRhdGVfdHJhY2sobmV3X3RyYWNrc1tqXSwge2Zyb20gOiBsb2MuZnJvbSwgdG8gOiBsb2MudG99KTtcblx0ICAgIH1cblx0fVxuXG5cdGZvciAodmFyIHg9MDsgeDx0cmFja3MubGVuZ3RoOyB4KyspIHtcblx0ICAgIHRyYWNrc1t4XS5nLnJlbW92ZSgpO1xuXHR9XG5cblx0dHJhY2tzID0gbmV3X3RyYWNrcztcblx0X3BsYWNlX3RyYWNrcygpO1xuXG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgncmVtb3ZlX3RyYWNrJywgZnVuY3Rpb24gKHRyYWNrKSB7XG5cdHRyYWNrLmcucmVtb3ZlKCk7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnYWRkX3RyYWNrJywgZnVuY3Rpb24gKHRyYWNrKSB7XG5cdGlmICh0cmFjayBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2subGVuZ3RoOyBpKyspIHtcblx0XHR0cmFja192aXMuYWRkX3RyYWNrICh0cmFja1tpXSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdHJhY2tfdmlzO1xuXHR9XG5cdHRyYWNrcy5wdXNoKHRyYWNrKTtcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QoJ3RyYWNrcycsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHRyYWNrc1xuXHR9XG5cdHRyYWNrcyA9IG5ld190cmFja3M7XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICAvLyBcbiAgICBhcGkubWV0aG9kICgnd2lkdGgnLCBmdW5jdGlvbiAodykge1xuXHQvLyBUT0RPOiBBbGxvdyBzdWZmaXhlcyBsaWtlIFwiMTAwMHB4XCI/XG5cdC8vIFRPRE86IFRlc3Qgd3JvbmcgZm9ybWF0c1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB3aWR0aDtcblx0fVxuXHQvLyBBdCBsZWFzdCBtaW4td2lkdGhcblx0aWYgKHcgPCBtaW5fd2lkdGgpIHtcblx0ICAgIHcgPSBtaW5fd2lkdGhcblx0fVxuXG5cdC8vIFdlIGFyZSByZXNpemluZ1xuXHRpZiAoZGl2X2lkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG5cdCAgICAvLyBSZXNpemUgdGhlIHpvb21pbmcvcGFubmluZyBwYW5lXG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zdHlsZShcIndpZHRoXCIsIChwYXJzZUludCh3KSArIGNhcF93aWR0aCoyKSArIFwicHhcIik7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfcGFuZVwiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG5cblx0ICAgIC8vIFJlcGxvdFxuXHQgICAgd2lkdGggPSB3O1xuXHQgICAgcGxvdCgpO1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHRcdHRyYWNrc1tpXS5nLnNlbGVjdChcInJlY3RcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkucmVzZXQuY2FsbCh0cmFja3NbaV0pO1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkudXBkYXRlLmNhbGwodHJhY2tzW2ldLHhTY2FsZSk7XG5cdCAgICB9XG5cdCAgICBcblx0fSBlbHNlIHtcblx0ICAgIHdpZHRoID0gdztcblx0fVxuXHRcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QoJ2FsbG93X2RyYWcnLCBmdW5jdGlvbihiKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGRyYWdfYWxsb3dlZDtcblx0fVxuXHRkcmFnX2FsbG93ZWQgPSBiO1xuXHRpZiAoZHJhZ19hbGxvd2VkKSB7XG5cdCAgICAvLyBXaGVuIHRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvbiB0aGUgb2JqZWN0IGJlZm9yZSBzdGFydGluZyB0aGUgc2ltdWxhdGlvbiwgd2UgZG9uJ3QgaGF2ZSBkZWZpbmVkIHhTY2FsZVxuXHQgICAgaWYgKHhTY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0c3ZnX2cuY2FsbCggem9vbUV2ZW50SGFuZGxlci54KHhTY2FsZSlcblx0XHRcdCAgIC8vIC54RXh0ZW50KFswLCBsaW1pdHMucmlnaHRdKVxuXHRcdFx0ICAgLnNjYWxlRXh0ZW50KFsobG9jLnRvLWxvYy5mcm9tKS8obGltaXRzLnpvb21fb3V0LTEpLCAobG9jLnRvLWxvYy5mcm9tKS9saW1pdHMuem9vbV9pbl0pXG5cdFx0XHQgICAub24oXCJ6b29tXCIsIF9tb3ZlKSApO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgLy8gV2UgY3JlYXRlIGEgbmV3IGR1bW15IHNjYWxlIGluIHggdG8gYXZvaWQgZHJhZ2dpbmcgdGhlIHByZXZpb3VzIG9uZVxuXHQgICAgLy8gVE9ETzogVGhlcmUgbWF5IGJlIGEgY2hlYXBlciB3YXkgb2YgZG9pbmcgdGhpcz9cblx0ICAgIHpvb21FdmVudEhhbmRsZXIueChkMy5zY2FsZS5saW5lYXIoKSkub24oXCJ6b29tXCIsIG51bGwpO1xuXHR9XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICB2YXIgX3BsYWNlX3RyYWNrcyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGggPSAwO1xuXHRmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICBpZiAodHJhY2suZy5hdHRyKFwidHJhbnNmb3JtXCIpKSB7XG5cdFx0dHJhY2suZ1xuXHRcdCAgICAudHJhbnNpdGlvbigpXG5cdFx0ICAgIC5kdXJhdGlvbihkdXIpXG5cdFx0ICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyBoICsgXCIpXCIpO1xuXHQgICAgfSBlbHNlIHtcblx0XHR0cmFjay5nXG5cdFx0ICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyBoICsgXCIpXCIpO1xuXHQgICAgfVxuXG5cdCAgICBoICs9IHRyYWNrLmhlaWdodCgpO1xuXHR9XG5cblx0Ly8gc3ZnXG5cdHN2Zy5hdHRyKFwiaGVpZ2h0XCIsIGggKyBoZWlnaHRfb2Zmc2V0KTtcblxuXHQvLyBkaXZcblx0ZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZClcblx0ICAgIC5zdHlsZShcImhlaWdodFwiLCAoaCArIDEwICsgaGVpZ2h0X29mZnNldCkgKyBcInB4XCIpO1xuXG5cdC8vIGNhcHNcblx0ZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoKVxuXHQgICAgLy8gLm1vdmVfdG9fZnJvbnQoKVxuXHQgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcblx0XHRtb3ZlX3RvX2Zyb250KHRoaXMpO1xuXHQgICAgfSlcblx0ZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoKVxuXHQvLy5tb3ZlX3RvX2Zyb250KClcblx0ICAgIC5lYWNoIChmdW5jdGlvbiAoZCkge1xuXHRcdG1vdmVfdG9fZnJvbnQodGhpcyk7XG5cdCAgICB9KTtcblx0XG5cblx0Ly8gcGFuZVxuXHRwYW5lXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cblx0Ly8gdG9vV2lkZV90ZXh0LiBUT0RPOiBJcyB0aGlzIHN0aWxsIG5lZWRlZD9cblx0Ly8gdmFyIHRvb1dpZGVfdGV4dCA9IGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl90b29XaWRlXCIpO1xuXHQvLyB2YXIgYmIgPSB0b29XaWRlX3RleHRbMF1bMF0uZ2V0QkJveCgpO1xuXHQvLyB0b29XaWRlX3RleHRcblx0Ly8gICAgIC5hdHRyKFwieVwiLCB+fihoLzIpIC0gYmIuaGVpZ2h0LzIpO1xuXG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfVxuXG4gICAgdmFyIF9pbml0X3RyYWNrID0gZnVuY3Rpb24gKHRyYWNrKSB7XG5cdHRyYWNrLmcgPSBzdmcuc2VsZWN0KFwiZ1wiKS5zZWxlY3QoXCJnXCIpXG5cdCAgICAuYXBwZW5kKFwiZ1wiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF90cmFja1wiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkpO1xuXG5cdC8vIFJlY3QgZm9yIHRoZSBiYWNrZ3JvdW5kIGNvbG9yXG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgMClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB0cmFja192aXMud2lkdGgoKSlcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLnN0eWxlKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cblx0aWYgKHRyYWNrLmRpc3BsYXkoKSkge1xuXHQgICAgdHJhY2suZGlzcGxheSgpLmluaXQuY2FsbCh0cmFjaywgd2lkdGgpO1xuXHR9XG5cdFxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH07XG5cbiAgICB2YXIgX21hbnVhbF9tb3ZlID0gZnVuY3Rpb24gKGZhY3RvciwgZGlyZWN0aW9uKSB7XG5cdHZhciBvbGREb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cblx0dmFyIHNwYW4gPSBvbGREb21haW5bMV0gLSBvbGREb21haW5bMF07XG5cdHZhciBvZmZzZXQgPSAoc3BhbiAqIGZhY3RvcikgLSBzcGFuO1xuXG5cdHZhciBuZXdEb21haW47XG5cdHN3aXRjaCAoZGlyZWN0aW9uKSB7XG5cdGNhc2UgLTEgOlxuXHQgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSAtIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuXHQgICAgYnJlYWs7XG5cdGNhc2UgMSA6XG5cdCAgICBuZXdEb21haW4gPSBbKH5+b2xkRG9tYWluWzBdICsgb2Zmc2V0KSwgfn4ob2xkRG9tYWluWzFdIC0gb2Zmc2V0KV07XG5cdCAgICBicmVhaztcblx0Y2FzZSAwIDpcblx0ICAgIG5ld0RvbWFpbiA9IFtvbGREb21haW5bMF0gLSB+fihvZmZzZXQvMiksIG9sZERvbWFpblsxXSArICh+fm9mZnNldC8yKV07XG5cdH1cblxuXHR2YXIgaW50ZXJwb2xhdG9yID0gZDMuaW50ZXJwb2xhdGVOdW1iZXIob2xkRG9tYWluWzBdLCBuZXdEb21haW5bMF0pO1xuXHR2YXIgZWFzZSA9IGV4cG9ydHMuZWFzZTtcblxuXHR2YXIgeCA9IDA7XG5cdGQzLnRpbWVyKGZ1bmN0aW9uKCkge1xuXHQgICAgdmFyIGN1cnJfc3RhcnQgPSBpbnRlcnBvbGF0b3IoZWFzZSh4KSk7XG5cdCAgICB2YXIgY3Vycl9lbmQ7XG5cdCAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuXHQgICAgY2FzZSAtMSA6XG5cdFx0Y3Vycl9lbmQgPSBjdXJyX3N0YXJ0ICsgc3Bhbjtcblx0XHRicmVhaztcblx0ICAgIGNhc2UgMSA6XG5cdFx0Y3Vycl9lbmQgPSBjdXJyX3N0YXJ0ICsgc3Bhbjtcblx0XHRicmVhaztcblx0ICAgIGNhc2UgMCA6XG5cdFx0Y3Vycl9lbmQgPSBvbGREb21haW5bMV0gKyBvbGREb21haW5bMF0gLSBjdXJyX3N0YXJ0O1xuXHRcdGJyZWFrO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgY3VyckRvbWFpbiA9IFtjdXJyX3N0YXJ0LCBjdXJyX2VuZF07XG5cdCAgICB4U2NhbGUuZG9tYWluKGN1cnJEb21haW4pO1xuXHQgICAgX21vdmUoeFNjYWxlKTtcblx0ICAgIHgrPTAuMDI7XG5cdCAgICByZXR1cm4geD4xO1xuXHR9KTtcbiAgICB9O1xuXG5cbiAgICB2YXIgX21vdmVfY2JhayA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGN1cnJEb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdHRyYWNrX3Zpcy5mcm9tKH5+Y3VyckRvbWFpblswXSk7XG5cdHRyYWNrX3Zpcy50byh+fmN1cnJEb21haW5bMV0pO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICBfdXBkYXRlX3RyYWNrKHRyYWNrLCBsb2MpO1xuXHR9XG4gICAgfTtcbiAgICAvLyBUaGUgZGVmZXJyZWRfY2JhayBpcyBkZWZlcnJlZCBhdCBsZWFzdCB0aGlzIGFtb3VudCBvZiB0aW1lIG9yIHJlLXNjaGVkdWxlZCBpZiBkZWZlcnJlZCBpcyBjYWxsZWQgYmVmb3JlXG4gICAgdmFyIF9kZWZlcnJlZCA9IGRlZmVyQ2FuY2VsKF9tb3ZlX2NiYWssIDMwMCk7XG5cbiAgICAvLyBhcGkubWV0aG9kKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gXHRfbW92ZSgpO1xuICAgIC8vIH0pO1xuXG4gICAgdmFyIF9tb3ZlID0gZnVuY3Rpb24gKG5ld194U2NhbGUpIHtcblx0aWYgKG5ld194U2NhbGUgIT09IHVuZGVmaW5lZCAmJiBkcmFnX2FsbG93ZWQpIHtcblx0ICAgIHpvb21FdmVudEhhbmRsZXIueChuZXdfeFNjYWxlKTtcblx0fVxuXG5cdC8vIFNob3cgdGhlIHJlZCBiYXJzIGF0IHRoZSBsaW1pdHNcblx0dmFyIGRvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcblx0aWYgKGRvbWFpblswXSA8PSA1KSB7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfNXBjYXBcIilcblx0XHQuYXR0cihcIndpZHRoXCIsIGNhcF93aWR0aClcblx0XHQudHJhbnNpdGlvbigpXG5cdFx0LmR1cmF0aW9uKDIwMClcblx0XHQuYXR0cihcIndpZHRoXCIsIDApO1xuXHR9XG5cblx0aWYgKGRvbWFpblsxXSA+PSAobGltaXRzLnJpZ2h0KS01KSB7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfM3BjYXBcIilcblx0XHQuYXR0cihcIndpZHRoXCIsIGNhcF93aWR0aClcblx0XHQudHJhbnNpdGlvbigpXG5cdFx0LmR1cmF0aW9uKDIwMClcblx0XHQuYXR0cihcIndpZHRoXCIsIDApO1xuXHR9XG5cblxuXHQvLyBBdm9pZCBtb3ZpbmcgcGFzdCB0aGUgbGltaXRzXG5cdGlmIChkb21haW5bMF0gPCBsaW1pdHMubGVmdCkge1xuXHQgICAgem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoW3pvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMF0gLSB4U2NhbGUobGltaXRzLmxlZnQpICsgeFNjYWxlLnJhbmdlKClbMF0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcblx0fSBlbHNlIGlmIChkb21haW5bMV0gPiBsaW1pdHMucmlnaHQpIHtcblx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5yaWdodCkgKyB4U2NhbGUucmFuZ2UoKVsxXSwgem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVsxXV0pO1xuXHR9XG5cblx0X2RlZmVycmVkKCk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciB0cmFjayA9IHRyYWNrc1tpXTtcblx0ICAgIHRyYWNrLmRpc3BsYXkoKS5tb3ZlLmNhbGwodHJhY2sseFNjYWxlKTtcblx0fVxuICAgIH07XG5cbiAgICAvLyBhcGkubWV0aG9kKHtcbiAgICAvLyBcdGFsbG93X2RyYWcgOiBhcGlfYWxsb3dfZHJhZyxcbiAgICAvLyBcdHdpZHRoICAgICAgOiBhcGlfd2lkdGgsXG4gICAgLy8gXHRhZGRfdHJhY2sgIDogYXBpX2FkZF90cmFjayxcbiAgICAvLyBcdHJlb3JkZXIgICAgOiBhcGlfcmVvcmRlcixcbiAgICAvLyBcdHpvb20gICAgICAgOiBhcGlfem9vbSxcbiAgICAvLyBcdGxlZnQgICAgICAgOiBhcGlfbGVmdCxcbiAgICAvLyBcdHJpZ2h0ICAgICAgOiBhcGlfcmlnaHQsXG4gICAgLy8gXHRzdGFydCAgICAgIDogYXBpX3N0YXJ0XG4gICAgLy8gfSk7XG5cbiAgICAvLyBBdXhpbGlhciBmdW5jdGlvbnNcbiAgICBmdW5jdGlvbiBtb3ZlX3RvX2Zyb250IChlbGVtKSB7XG5cdGVsZW0ucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChlbGVtKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRyYWNrX3Zpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGJvYXJkO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGVuc2VtYmxSZXN0QVBJID0gcmVxdWlyZShcInRudC5lbnNlbWJsXCIpO1xuXG4vLyB2YXIgYm9hcmQgPSB7fTtcbi8vIGJvYXJkLnRyYWNrID0ge307XG5cbnZhciBkYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIF8gPSBmdW5jdGlvbiAoKSB7XG4gICAgfTtcblxuICAgIC8vIEdldHRlcnMgLyBTZXR0ZXJzXG4gICAgYXBpanMgKF8pXG5cdC5nZXRzZXQgKCdsYWJlbCcsIFwiXCIpXG5cdC5nZXRzZXQgKCdlbGVtZW50cycsIFtdKVxuXHQuZ2V0c2V0ICgndXBkYXRlJywgZnVuY3Rpb24gKCkge30pO1xuXG5cbiAgICAvLyBUaGUgcmV0cmlldmVycy4gVGhleSBuZWVkIHRvIGFjY2VzcyAnZWxlbWVudHMnXG4gICAgZGF0YS5yZXRyaWV2ZXIgPSB7fTtcblxuICAgIGRhdGEucmV0cmlldmVyLnN5bmMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAvLyBPYmplY3QgaGFzIGEgbG9jYXRpb24gYW5kIGEgcGx1Zy1pbiBkZWZpbmVkIGNhbGxiYWNrXG4gICAgICAgICAgICBfLmVsZW1lbnRzKHVwZGF0ZV90cmFjay5yZXRyaWV2ZXIoKShvYmoubG9jKSk7XG4gICAgICAgICAgICBvYmoub25fc3VjY2VzcygpO1xuXHR9O1xuXG5cdGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdCAgICAuZ2V0c2V0ICgncmV0cmlldmVyJywgZnVuY3Rpb24gKCkge30pXG5cblx0cmV0dXJuIHVwZGF0ZV90cmFjaztcbiAgICB9O1xuXG4gICAgZGF0YS5yZXRyaWV2ZXIuYXN5bmMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciB1cmwgPSAnJztcblxuXHR2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKG9iaikge1xuXHQgICAgZDMuanNvbih1cmwsIGZ1bmN0aW9uIChlcnIsIHJlc3ApIHtcblx0XHRfLmVsZW1lbnRzKHJlc3ApO1xuXHRcdG9iai5vbl9zdWNjZXNzKCk7XG5cdCAgICB9KTsgXG5cdH07XG5cblx0YXBpanMgKHVwZGF0ZV90cmFjaylcblx0ICAgIC5nZXRzZXQgKCd1cmwnLCAnJyk7XG5cblx0cmV0dXJuIHVwZGF0ZV90cmFjaztcbiAgICB9O1xuXG4gICAgZGF0YS5yZXRyaWV2ZXIuZW5zZW1ibCA9IGZ1bmN0aW9uKCkge1xuICAgIFx0dmFyIHN1Y2Nlc3MgPSBbZnVuY3Rpb24gKCkge31dO1xuICAgIFx0dmFyIGVuZHBvaW50O1xuICAgIFx0dmFyIGVSZXN0ID0gZW5zZW1ibFJlc3RBUEkoKTtcbiAgICBcdHZhciB1cGRhdGVfdHJhY2sgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIC8vIE9iamVjdCBoYXMgbG9jIGFuZCBhIHBsdWctaW4gZGVmaW5lZCBjYWxsYmFja1xuICAgICAgICAgICAgdmFyIGxvYyAgICAgICAgID0gb2JqLmxvYztcbiAgICAgICAgICAgIHZhciBwbHVnaW5fY2JhayA9IG9iai5vbl9zdWNjZXNzO1xuICAgICAgICAgICAgZVJlc3QuY2FsbCh7dXJsICAgICA6IGVSZXN0LnVybFt1cGRhdGVfdHJhY2suZW5kcG9pbnQoKV0obG9jKSxcbiAgICBcdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVsZW1lbnRzKHJlc3ApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2VyLWRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8c3VjY2Vzcy5sZW5ndGg7IGkrKykge1xuICAgIFx0XHRcdFx0c3VjY2Vzc1tpXShyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQbHVnLWluIGRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbHVnaW5fY2JhaygpO1xuICAgIFx0XHRcdH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICBcdH07XG5cbiAgICBcdGFwaWpzKHVwZGF0ZV90cmFjaylcbiAgICBcdCAgICAuZ2V0c2V0KCdlbmRwb2ludCcpO1xuXG4gICAgLy8gVE9ETzogV2UgZG9uJ3QgaGF2ZSBhIHdheSBvZiByZXNldHRpbmcgdGhlIHN1Y2Nlc3MgYXJyYXlcbiAgICAvLyBUT0RPOiBTaG91bGQgdGhpcyBhbHNvIGJlIGluY2x1ZGVkIGluIHRoZSBzeW5jIHJldHJpZXZlcj9cbiAgICAvLyBTdGlsbCBub3Qgc3VyZSB0aGlzIGlzIHRoZSBiZXN0IG9wdGlvbiB0byBzdXBwb3J0IG1vcmUgdGhhbiBvbmUgY2FsbGJhY2tcbiAgICBcdHVwZGF0ZV90cmFjay5zdWNjZXNzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdFx0cmV0dXJuIHN1Y2Nlc3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdWNjZXNzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmV0dXJuIHVwZGF0ZV90cmFjaztcbiAgICBcdH07XG5cbiAgICBcdHJldHVybiB1cGRhdGVfdHJhY2s7XG4gICAgfTtcblxuXG4gICAgcmV0dXJuIF87XG59O1xuXG5cbi8vIEEgcHJlZGVmaW5lZCB0cmFjayBmb3IgZ2VuZXNcbi8vIHRudC50cmFjay5kYXRhLmdlbmUgPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgdmFyIHRyYWNrID0gdG50LnRyYWNrLmRhdGEoKTtcbi8vIFx0Ly8gLmluZGV4KFwiSURcIik7XG5cbi8vICAgICB2YXIgdXBkYXRlciA9IHRudC50cmFjay5yZXRyaWV2ZXIuZW5zZW1ibCgpXG4vLyBcdC5lbmRwb2ludChcInJlZ2lvblwiKVxuLy8gICAgIC8vIFRPRE86IElmIHN1Y2Nlc3MgaXMgZGVmaW5lZCBoZXJlLCBtZWFucyB0aGF0IGl0IGNhbid0IGJlIHVzZXItZGVmaW5lZFxuLy8gICAgIC8vIGlzIHRoYXQgZ29vZD8gZW5vdWdoPyBBUEk/XG4vLyAgICAgLy8gVVBEQVRFOiBOb3cgc3VjY2VzcyBpcyBiYWNrZWQgdXAgYnkgYW4gYXJyYXkuIFN0aWxsIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCBvcHRpb25cbi8vIFx0LnN1Y2Nlc3MoZnVuY3Rpb24oZ2VuZXMpIHtcbi8vIFx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbi8vIFx0XHRpZiAoZ2VuZXNbaV0uc3RyYW5kID09PSAtMSkgeyAgXG4vLyBcdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmVzW2ldLmV4dGVybmFsX25hbWU7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHQgICAgZ2VuZXNbaV0uZGlzcGxheV9sYWJlbCA9IGdlbmVzW2ldLmV4dGVybmFsX25hbWUgKyBcIj5cIjtcbi8vIFx0XHR9XG4vLyBcdCAgICB9XG4vLyBcdH0pO1xuXG4vLyAgICAgcmV0dXJuIHRyYWNrLnVwZGF0ZSh1cGRhdGVyKTtcbi8vIH1cblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGRpc3BsYXlpbmcgbm8gZXh0ZXJuYWwgZGF0YVxuLy8gaXQgaXMgdXNlZCBmb3IgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tzIGZvciBleGFtcGxlXG5kYXRhLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0cmFjayA9IGRhdGEoKTtcbiAgICB2YXIgdXBkYXRlciA9IGRhdGEucmV0cmlldmVyLnN5bmMoKTtcbiAgICB0cmFjay51cGRhdGUodXBkYXRlcik7XG5cbiAgICByZXR1cm4gdHJhY2s7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkYXRhO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcblxuLy8gRkVBVFVSRSBWSVNcbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciB0bnRfZmVhdHVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLy8vLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0Y3JlYXRlICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJjcmVhdGVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwifSxcblx0bW92ZXIgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJtb3ZlX2VsZW0gaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2UgZmVhdHVyZSBvYmplY3RcIn0sXG5cdHVwZGF0ZXIgIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX2NsaWNrIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX21vdXNlb3ZlciA6IGZ1bmN0aW9uICgpIHt9LFxuXHRndWlkZXIgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHRpbmRleCAgICA6IHVuZGVmaW5lZCxcblx0bGF5b3V0ICAgOiBsYXlvdXQuaWRlbnRpdHkoKSxcblx0Zm9yZWdyb3VuZF9jb2xvciA6ICcjMDAwJ1xuICAgIH07XG5cblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3RcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpLnJlbW92ZSgpO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcIi50bnRfZ3VpZGVyXCIpLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRleHBvcnRzLmd1aWRlci5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24gKG5ld19lbGVtcywgdHJhY2ssIHhTY2FsZSkge1xuXHRuZXdfZWxlbXMub24oXCJjbGlja1wiLCBleHBvcnRzLm9uX2NsaWNrKTtcblx0bmV3X2VsZW1zLm9uKFwibW91c2VvdmVyXCIsIGV4cG9ydHMub25fbW91c2VvdmVyKTtcblx0Ly8gbmV3X2VsZW0gaXMgYSBnIGVsZW1lbnQgd2hlcmUgdGhlIGZlYXR1cmUgaXMgaW5zZXJ0ZWRcblx0ZXhwb3J0cy5jcmVhdGUuY2FsbCh0cmFjaywgbmV3X2VsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGxheW91dCA9IGV4cG9ydHMubGF5b3V0O1xuXG5cdHZhciBlbGVtZW50cyA9IHRyYWNrLmRhdGEoKS5lbGVtZW50cygpO1xuXG5cdGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBlbGVtZW50cyA9IGVsZW1lbnRzW2ZpZWxkXTtcblx0fVxuXG5cdGxheW91dChlbGVtZW50cywgeFNjYWxlKTtcblx0dmFyIGRhdGFfZWxlbXMgPSBsYXlvdXQuZWxlbWVudHMoKTtcblxuXHR2YXIgdmlzX3NlbDtcblx0dmFyIHZpc19lbGVtcztcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuXHR9XG5cblx0aWYgKGV4cG9ydHMuaW5kZXgpIHsgLy8gSW5kZXhpbmcgYnkgZmllbGRcblx0ICAgIHZpc19lbGVtcyA9IHZpc19zZWxcblx0XHQuZGF0YShkYXRhX2VsZW1zLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICBpZiAoZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gZXhwb3J0cy5pbmRleChkKTtcblx0XHQgICAgfVxuXHRcdH0pXG5cdH0gZWxzZSB7IC8vIEluZGV4aW5nIGJ5IHBvc2l0aW9uIGluIGFycmF5XG5cdCAgICB2aXNfZWxlbXMgPSB2aXNfc2VsXG5cdFx0LmRhdGEoZGF0YV9lbGVtcylcblx0fVxuXG5cdGV4cG9ydHMudXBkYXRlci5jYWxsKHRyYWNrLCB2aXNfZWxlbXMsIHhTY2FsZSk7XG5cblx0dmFyIG5ld19lbGVtID0gdmlzX2VsZW1zXG5cdCAgICAuZW50ZXIoKTtcblxuXHRuZXdfZWxlbVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZWxlbVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbV9cIiArIGZpZWxkLCBmaWVsZClcblx0ICAgIC5jYWxsKGZlYXR1cmUucGxvdCwgdHJhY2ssIHhTY2FsZSk7XG5cblx0dmlzX2VsZW1zXG5cdCAgICAuZXhpdCgpXG5cdCAgICAucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBtb3ZlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGVsZW1zO1xuXHQvLyBUT0RPOiBJcyBzZWxlY3RpbmcgdGhlIGVsZW1lbnRzIHRvIG1vdmUgdG9vIHNsb3c/XG5cdC8vIEl0IHdvdWxkIGJlIG5pY2UgdG8gcHJvZmlsZVxuXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgZWxlbXMgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICBlbGVtcyA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbVwiKTtcblx0fVxuXG5cdGV4cG9ydHMubW92ZXIuY2FsbCh0aGlzLCBlbGVtcywgeFNjYWxlKTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdmVfdG9fZnJvbnQgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICB2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHQgICAgc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpLm1vdmVfdG9fZnJvbnQoKTtcblx0fVxuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZSlcblx0LmdldHNldCAoZXhwb3J0cylcblx0Lm1ldGhvZCAoe1xuXHQgICAgcmVzZXQgIDogcmVzZXQsXG5cdCAgICBwbG90ICAgOiBwbG90LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBtb3ZlX3RvX2Zyb250IDogbW92ZV90b19mcm9udFxuXHR9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuY29tcG9zaXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaXNwbGF5cyA9IHt9O1xuICAgIHZhciBkaXNwbGF5X29yZGVyID0gW107XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB7fTtcblxuICAgIHZhciByZXNldCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBkaXNwbGF5c1tpXS5yZXNldC5jYWxsKHRyYWNrKTtcblx0fVxuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuIFx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0uaW5pdC5jYWxsKHRyYWNrLCB3aWR0aCk7XG5cdCAgICB9XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uICh4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXlfb3JkZXJbaV0pO1xuXHQgICAgZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0ubW92ZV90b19mcm9udC5jYWxsKHRyYWNrLCBkaXNwbGF5X29yZGVyW2ldKTtcblx0fVxuXHQvLyBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG5cdC8vICAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcblx0Ly8gXHRkaXNwbGF5c1tkaXNwbGF5XS51cGRhdGUuY2FsbCh0cmFjaywgeFNjYWxlLCBkaXNwbGF5KTtcblx0Ly8gICAgIH1cblx0Ly8gfVxuICAgIH07XG5cbiAgICB2YXIgbW92ZSA9IGZ1bmN0aW9uICh4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0ubW92ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXkpO1xuXHQgICAgfVxuXHR9XG4gICAgfTtcblxuICAgIHZhciBhZGQgPSBmdW5jdGlvbiAoa2V5LCBkaXNwbGF5KSB7XG5cdGRpc3BsYXlzW2tleV0gPSBkaXNwbGF5O1xuXHRkaXNwbGF5X29yZGVyLnB1c2goa2V5KTtcblx0cmV0dXJuIGZlYXR1cmVzO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZXMpXG5cdC5tZXRob2QgKHtcblx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBhZGQgICAgOiBhZGRcblx0fSk7XG5cblxuICAgIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnRudF9mZWF0dXJlLnNlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcblx0Zm9udHNpemUgOiAxMCxcblx0c2VxdWVuY2UgOiBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuc2VxdWVuY2Vcblx0fVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGZlYXR1cmUpXG5cdC5nZXRzZXQgKGNvbmZpZyk7XG5cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X250cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bmV3X250c1xuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIGNvbmZpZy5mb250c2l6ZSArIFwicHhcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUgKGQucG9zKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gfn4odHJhY2suaGVpZ2h0KCkgLyAyKSArIDU7IFxuXHQgICAgfSlcblx0ICAgIC50ZXh0KGNvbmZpZy5zZXF1ZW5jZSlcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cignZmlsbCcsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChudHMsIHhTY2FsZSkge1xuXHRudHMuc2VsZWN0IChcInRleHRcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUoZC5wb3MpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmFyZWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG4gICAgdmFyIGxpbmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG5cbiAgICB2YXIgYXJlYSA9IGQzLnN2Zy5hcmVhKClcblx0LmludGVycG9sYXRlKGxpbmUuaW50ZXJwb2xhdGUoKSlcblx0LnRlbnNpb24oZmVhdHVyZS50ZW5zaW9uKCkpO1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgdmFyIGxpbmVfY3JlYXRlID0gZmVhdHVyZS5jcmVhdGUoKTsgLy8gV2UgJ3NhdmUnIGxpbmUgY3JlYXRpb25cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKHBvaW50cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0aWYgKGRhdGFfcG9pbnRzICE9PSB1bmRlZmluZWQpIHtcbi8vXHQgICAgIHJldHVybjtcblx0ICAgIHRyYWNrLmcuc2VsZWN0KFwicGF0aFwiKS5yZW1vdmUoKTtcblx0fVxuXG5cdGxpbmVfY3JlYXRlLmNhbGwodHJhY2ssIHBvaW50cywgeFNjYWxlKTtcblxuXHRhcmVhXG5cdCAgICAueChsaW5lLngoKSlcblx0ICAgIC55MShsaW5lLnkoKSlcblx0ICAgIC55MCh0cmFjay5oZWlnaHQoKSk7XG5cblx0ZGF0YV9wb2ludHMgPSBwb2ludHMuZGF0YSgpO1xuXHRwb2ludHMucmVtb3ZlKCk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfYXJlYVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbVwiLCB0cnVlKVxuXHQgICAgLmRhdHVtKGRhdGFfcG9pbnRzKVxuXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKS5icmlnaHRlcigpKTtcblx0XG4gICAgfSk7XG5cbiAgICB2YXIgbGluZV9tb3ZlciA9IGZlYXR1cmUubW92ZXIoKTtcbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGxpbmVfbW92ZXIuY2FsbCh0cmFjaywgcGF0aCwgeFNjYWxlKTtcblxuXHRhcmVhLngobGluZS54KCkpO1xuXHR0cmFjay5nXG5cdCAgICAuc2VsZWN0KFwiLnRudF9hcmVhXCIpXG5cdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG5cdCAgICAuYXR0cihcImRcIiwgYXJlYSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcblxufTtcblxudG50X2ZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgeCA9IGZ1bmN0aW9uIChkKSB7XG5cdHJldHVybiBkLnBvcztcbiAgICB9O1xuICAgIHZhciB5ID0gZnVuY3Rpb24gKGQpIHtcblx0cmV0dXJuIGQudmFsO1xuICAgIH07XG4gICAgdmFyIHRlbnNpb24gPSAwLjc7XG4gICAgdmFyIHlTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpO1xuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHQuaW50ZXJwb2xhdGUoXCJiYXNpc1wiKTtcblxuICAgIC8vIGxpbmUgZ2V0dGVyLiBUT0RPOiBTZXR0ZXI/XG4gICAgZmVhdHVyZS5saW5lID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gbGluZTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS54ID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4geDtcblx0fVxuXHR4ID0gY2Jhaztcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueSA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHk7XG5cdH1cblx0eSA9IGNiYWs7XG5cdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnRlbnNpb24gPSBmdW5jdGlvbiAodCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB0ZW5zaW9uO1xuXHR9XG5cdHRlbnNpb24gPSB0O1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgLy8gRm9yIG5vdywgY3JlYXRlIGlzIGEgb25lLW9mZiBldmVudFxuICAgIC8vIFRPRE86IE1ha2UgaXQgd29yayB3aXRoIHBhcnRpYWwgcGF0aHMsIGllLiBjcmVhdGluZyBhbmQgZGlzcGxheWluZyBvbmx5IHRoZSBwYXRoIHRoYXQgaXMgYmVpbmcgZGlzcGxheWVkXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChwb2ludHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGlmIChkYXRhX3BvaW50cyAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAvLyByZXR1cm47XG5cdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG5cdH1cblxuXHRsaW5lXG5cdCAgICAudGVuc2lvbih0ZW5zaW9uKVxuXHQgICAgLngoZnVuY3Rpb24gKGQpIHtyZXR1cm4geFNjYWxlKHgoZCkpfSlcblx0ICAgIC55KGZ1bmN0aW9uIChkKSB7cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKHkoZCkpfSlcblxuXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG5cdHBvaW50cy5yZW1vdmUoKTtcblxuXHR5U2NhbGVcblx0ICAgIC5kb21haW4oWzAsIDFdKVxuXHQgICAgLy8gLmRvbWFpbihbMCwgZDMubWF4KGRhdGFfcG9pbnRzLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgLy8gXHRyZXR1cm4geShkKTtcblx0ICAgIC8vIH0pXSlcblx0ICAgIC5yYW5nZShbMCwgdHJhY2suaGVpZ2h0KCkgLSAyXSk7XG5cdFxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicGF0aFwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9lbGVtXCIpXG5cdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgNClcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgXCJub25lXCIpO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bGluZS54KGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4geFNjYWxlKHgoZCkpXG5cdH0pO1xuXHR0cmFjay5nLnNlbGVjdChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiZFwiLCBsaW5lKGRhdGFfcG9pbnRzKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmNvbnNlcnZhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlLmFyZWFcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlLmFyZWEoKTtcblxuICAgIHZhciBhcmVhX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBhcmVhIGNyZWF0aW9uXG4gICAgZmVhdHVyZS5jcmVhdGUgIChmdW5jdGlvbiAocG9pbnRzLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRhcmVhX2NyZWF0ZS5jYWxsKHRyYWNrLCBkMy5zZWxlY3QocG9pbnRzWzBdWzBdKSwgeFNjYWxlKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5lbnNlbWJsID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGJvYXJkLnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjIgPSBcIiM3RkZGMDBcIjtcbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjMgPSBcIiMwMEJCMDBcIjtcblxuICAgIGZlYXR1cmUuZ3VpZGVyIChmdW5jdGlvbiAod2lkdGgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAuOCkpIC8gMjtcblxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ndWlkZXJcIilcblx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0ICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcInkxXCIsIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuYXR0cihcInkyXCIsIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcImxpbmVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ3VpZGVyXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIDApXG5cdCAgICAuYXR0cihcIngyXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJ5MVwiLCB0cmFjay5oZWlnaHQoKSAtIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcblx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSlcblx0ICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogLjgpKSAvIDI7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSAoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGhlaWdodF9vZmZzZXQpXG4vLyBcdCAgICAuYXR0cihcInJ4XCIsIDMpXG4vLyBcdCAgICAuYXR0cihcInJ5XCIsIDMpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSAtIH5+KGhlaWdodF9vZmZzZXQgKiAyKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7IFxuXHRcdGlmIChkLnR5cGUgPT09ICdoaWdoJykge1xuXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblx0XHR9XG5cdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcblx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMoKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlciAoZnVuY3Rpb24gKGJsb2NrcywgeFNjYWxlKSB7XG5cdGJsb2Nrc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpXG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyID0gZnVuY3Rpb24gKGNvbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBmb3JlZ3JvdW5kX2NvbG9yMjtcblx0fVxuXHRmb3JlZ3JvdW5kX2NvbG9yMiA9IGNvbDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGZvcmVncm91bmRfY29sb3IzO1xuXHR9XG5cdGZvcmVncm91bmRfY29sb3IzID0gY29sO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS52bGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQgKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdC8vIFRPRE86IFNob3VsZCB1c2UgdGhlIGluZGV4IHZhbHVlP1xuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKVxuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSlcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInkxXCIsIDApXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uICh2bGluZXMsIHhTY2FsZSkge1xuXHR2bGluZXNcblx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgYXBpanMoZmVhdHVyZSlcblx0LmdldHNldCgnZnJvbScsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5zdGFydDtcblx0fSlcblx0LmdldHNldCgndG8nLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuZW5kO1xuXHR9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHQvLyBUT0RPOiBzdGFydCwgZW5kIHNob3VsZCBiZSBhZGp1c3RhYmxlIHZpYSB0aGUgdHJhY2tzIEFQSVxuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuXHRcdHJldHVybiAoeFNjYWxlKGZlYXR1cmUudG8oKShkLCBpKSkgLSB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm4gZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIGQuY29sb3I7XG5cdFx0fVxuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGVsZW1zLCB4U2NhbGUpIHtcblx0ZWxlbXNcblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoYmxvY2tzLCB4U2NhbGUpIHtcblx0YmxvY2tzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmF4aXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhBeGlzO1xuICAgIHZhciBvcmllbnRhdGlvbiA9IFwidG9wXCI7XG5cbiAgICAvLyBBeGlzIGRvZXNuJ3QgaW5oZXJpdCBmcm9tIGZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG5cdHhBeGlzID0gdW5kZWZpbmVkO1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcInJlY3RcIikucmVtb3ZlKCk7XG5cdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRpY2tcIikucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdHN2Z19nLmNhbGwoeEF4aXMpO1xuICAgIH1cbiAgICBcbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHQvLyBDcmVhdGUgQXhpcyBpZiBpdCBkb2Vzbid0IGV4aXN0XG5cdGlmICh4QXhpcyA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKClcblx0XHQuc2NhbGUoeFNjYWxlKVxuXHRcdC5vcmllbnQob3JpZW50YXRpb24pO1xuXHR9XG5cblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0c3ZnX2cuY2FsbCh4QXhpcyk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUub3JpZW50YXRpb24gPSBmdW5jdGlvbiAocG9zKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIG9yaWVudGF0aW9uO1xuXHR9XG5cdG9yaWVudGF0aW9uID0gcG9zO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5sb2NhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm93O1xuXG4gICAgdmFyIGZlYXR1cmUgPSB7fTtcbiAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5tb3ZlID0gZnVuY3Rpb24oeFNjYWxlKSB7XG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdHJvdy5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHR2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHRpZiAocm93ID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHJvdyA9IHN2Z19nO1xuXHQgICAgcm93XG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG5cdH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUgKFwiLi9ib2FyZC5qc1wiKTtcbmJvYXJkLnRyYWNrID0gcmVxdWlyZSAoXCIuL3RyYWNrXCIpO1xuYm9hcmQudHJhY2suZGF0YSA9IHJlcXVpcmUgKFwiLi9kYXRhLmpzXCIpO1xuYm9hcmQudHJhY2subGF5b3V0ID0gcmVxdWlyZSAoXCIuL2xheW91dC5qc1wiKTtcbmJvYXJkLnRyYWNrLmZlYXR1cmUgPSByZXF1aXJlIChcIi4vZmVhdHVyZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbmxheW91dCA9IHt9O1xuXG5sYXlvdXQuaWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGVsZW1lbnRzO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgbCA9IGZ1bmN0aW9uIChuZXdfZWxlbWVudHMpIHtcblx0ZWxlbWVudHMgPSBuZXdfZWxlbWVudHM7XG4gICAgfVxuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChsKVxuXHQubWV0aG9kICh7XG5cdCAgICBoZWlnaHQgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgZWxlbWVudHMgOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIGVsZW1lbnRzO1xuXHQgICAgfVxuXHR9KTtcblxuICAgIHJldHVybiBsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuLy92YXIgYm9hcmQgPSB7fTtcblxudmFyIHRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHJlYWRfY29uZiA9IHtcblx0Ly8gVW5pcXVlIElEIGZvciB0aGlzIHRyYWNrXG5cdGlkIDogdHJhY2suaWQoKVxuICAgIH07XG5cbiAgICB2YXIgZGlzcGxheTtcblxuICAgIHZhciBjb25mID0ge1xuXHQvLyBmb3JlZ3JvdW5kX2NvbG9yIDogZDMucmdiKCcjMDAwMDAwJyksXG5cdGJhY2tncm91bmRfY29sb3IgOiBkMy5yZ2IoJyNDQ0NDQ0MnKSxcblx0aGVpZ2h0ICAgICAgICAgICA6IDI1MCxcblx0Ly8gZGF0YSBpcyB0aGUgb2JqZWN0IChub3JtYWxseSBhIHRudC50cmFjay5kYXRhIG9iamVjdCkgdXNlZCB0byByZXRyaWV2ZSBhbmQgdXBkYXRlIGRhdGEgZm9yIHRoZSB0cmFja1xuXHRkYXRhICAgICAgICAgICAgIDogdHJhY2suZGF0YS5lbXB0eSgpXG4gICAgfTtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3QgLyBjbG9zdXJlXG4gICAgdmFyIF8gPSBmdW5jdGlvbigpIHtcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChfKVxuXHQuZ2V0c2V0IChjb25mKVxuXHQuZ2V0IChyZWFkX2NvbmYpO1xuXG4gICAgLy8gVE9ETzogVGhpcyBtZWFucyB0aGF0IGhlaWdodCBzaG91bGQgYmUgZGVmaW5lZCBiZWZvcmUgZGlzcGxheVxuICAgIC8vIHdlIHNob3VsZG4ndCByZWx5IG9uIHRoaXNcbiAgICBfLmRpc3BsYXkgPSBmdW5jdGlvbiAobmV3X3Bsb3R0ZXIpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gZGlzcGxheTtcblx0fVxuXHRkaXNwbGF5ID0gbmV3X3Bsb3R0ZXI7XG5cdGlmICh0eXBlb2YgKGRpc3BsYXkpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBkaXNwbGF5LmxheW91dCAmJiBkaXNwbGF5LmxheW91dCgpLmhlaWdodChjb25mLmhlaWdodCk7XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICBmb3IgKHZhciBrZXkgaW4gZGlzcGxheSkge1xuXHRcdGlmIChkaXNwbGF5Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHQgICAgZGlzcGxheVtrZXldLmxheW91dCAmJiBkaXNwbGF5W2tleV0ubGF5b3V0KCkuaGVpZ2h0KGNvbmYuaGVpZ2h0KTtcblx0XHR9XG5cdCAgICB9XG5cdH1cblxuXHRyZXR1cm4gXztcbiAgICB9O1xuXG4gICAgcmV0dXJuIF87XG5cbn07XG5cbnRyYWNrLmlkID0gaXRlcmF0b3IoMSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyYWNrO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0bnRfZW5zZW1ibCA9IHJlcXVpcmUoXCIuL3NyYy9yZXN0LmpzXCIpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyk7XG5cbmZ1bmN0aW9uIFJlcXVlc3RFcnJvcihtZXNzYWdlLCBwcm9wcykge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgZXJyLm5hbWUgPSAnUmVxdWVzdEVycm9yJztcbiAgICB0aGlzLm5hbWUgPSBlcnIubmFtZTtcbiAgICB0aGlzLm1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgfVxuXG4gICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIHRoaXNba10gPSBwcm9wc1trXTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuUmVxdWVzdEVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuUmVxdWVzdEVycm9yLmNyZWF0ZSA9IGZ1bmN0aW9uIChtZXNzYWdlLCByZXEsIHByb3BzKSB7XG4gICAgdmFyIGVyciA9IG5ldyBSZXF1ZXN0RXJyb3IobWVzc2FnZSwgcHJvcHMpO1xuICAgIFJlc3BvbnNlLmNhbGwoZXJyLCByZXEpO1xuICAgIHJldHVybiBlcnI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGksXG4gICAgY2xlYW5VUkwgPSByZXF1aXJlKCcuLi9wbHVnaW5zL2NsZWFudXJsJyksXG4gICAgWEhSID0gcmVxdWlyZSgnLi94aHInKSxcbiAgICBkZWxheSA9IHJlcXVpcmUoJy4vdXRpbHMvZGVsYXknKSxcbiAgICBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKS5jcmVhdGUsXG4gICAgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyksXG4gICAgUmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxuICAgIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyksXG4gICAgb25jZSA9IHJlcXVpcmUoJy4vdXRpbHMvb25jZScpO1xuXG5mdW5jdGlvbiBmYWN0b3J5KGRlZmF1bHRzLCBwbHVnaW5zKSB7XG4gICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCB7fTtcbiAgICBwbHVnaW5zID0gcGx1Z2lucyB8fCBbXTtcblxuICAgIGZ1bmN0aW9uIGh0dHAocmVxLCBjYikge1xuICAgICAgICB2YXIgeGhyLCBwbHVnaW4sIGRvbmUsIGssIHRpbWVvdXRJZDtcblxuICAgICAgICByZXEgPSBuZXcgUmVxdWVzdChleHRlbmQoZGVmYXVsdHMsIHJlcSkpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwbHVnaW4gPSBwbHVnaW5zW2ldO1xuICAgICAgICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHBsdWdpbi5wcm9jZXNzUmVxdWVzdChyZXEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2l2ZSB0aGUgcGx1Z2lucyBhIGNoYW5jZSB0byBjcmVhdGUgdGhlIFhIUiBvYmplY3RcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICBpZiAocGx1Z2luLmNyZWF0ZVhIUikge1xuICAgICAgICAgICAgICAgIHhociA9IHBsdWdpbi5jcmVhdGVYSFIocmVxKTtcbiAgICAgICAgICAgICAgICBicmVhazsgLy8gRmlyc3QgY29tZSwgZmlyc3Qgc2VydmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB4aHIgPSB4aHIgfHwgbmV3IFhIUigpO1xuXG4gICAgICAgIHJlcS54aHIgPSB4aHI7XG5cbiAgICAgICAgLy8gQmVjYXVzZSBYSFIgY2FuIGJlIGFuIFhNTEh0dHBSZXF1ZXN0IG9yIGFuIFhEb21haW5SZXF1ZXN0LCB3ZSBhZGRcbiAgICAgICAgLy8gYG9ucmVhZHlzdGF0ZWNoYW5nZWAsIGBvbmxvYWRgLCBhbmQgYG9uZXJyb3JgIGNhbGxiYWNrcy4gV2UgdXNlIHRoZVxuICAgICAgICAvLyBgb25jZWAgdXRpbCB0byBtYWtlIHN1cmUgdGhhdCBvbmx5IG9uZSBpcyBjYWxsZWQgKGFuZCBpdCdzIG9ubHkgY2FsbGVkXG4gICAgICAgIC8vIG9uZSB0aW1lKS5cbiAgICAgICAgZG9uZSA9IG9uY2UoZGVsYXkoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB4aHIub25sb2FkID0geGhyLm9uZXJyb3IgPSB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0geGhyLm9udGltZW91dCA9IHhoci5vbnByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgIHZhciByZXMgPSBlcnIgJiYgZXJyLmlzSHR0cEVycm9yID8gZXJyIDogbmV3IFJlc3BvbnNlKHJlcSk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzUmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcGx1Z2luLnByb2Nlc3NSZXNwb25zZShyZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXEub25sb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQocmVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIsIHJlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcblxuICAgICAgICAvLyBXaGVuIHRoZSByZXF1ZXN0IGNvbXBsZXRlcywgY29udGludWUuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocmVxLnRpbWVkT3V0KSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChyZXEuYWJvcnRlZCkge1xuICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ1JlcXVlc3QgYWJvcnRlZCcsIHJlcSwge25hbWU6ICdBYm9ydCd9KSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBNYXRoLmZsb29yKHhoci5zdGF0dXMgLyAxMDApO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDQwNCAmJiAhcmVxLmVycm9yT240MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBraW5kO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ0NsaWVudCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZCA9ICdTZXJ2ZXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ0hUVFAnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBtc2cgPSBraW5kICsgJyBFcnJvcjogJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIHNlcnZlciByZXR1cm5lZCBhIHN0YXR1cyBvZiAnICsgeGhyLnN0YXR1cyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIGZvciB0aGUgcmVxdWVzdCBcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm1ldGhvZC50b1VwcGVyQ2FzZSgpICsgJyAnICsgcmVxLnVybCArICdcIic7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IobXNnLCByZXEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYG9ubG9hZGAgaXMgb25seSBjYWxsZWQgb24gc3VjY2VzcyBhbmQsIGluIElFLCB3aWxsIGJlIGNhbGxlZCB3aXRob3V0XG4gICAgICAgIC8vIGB4aHIuc3RhdHVzYCBoYXZpbmcgYmVlbiBzZXQsIHNvIHdlIGRvbid0IGNoZWNrIGl0LlxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkgeyBkb25lKCk7IH07XG5cbiAgICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdJbnRlcm5hbCBYSFIgRXJyb3InLCByZXEpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJRSBzb21ldGltZXMgZmFpbHMgaWYgeW91IGRvbid0IHNwZWNpZnkgZXZlcnkgaGFuZGxlci5cbiAgICAgICAgLy8gU2VlIGh0dHA6Ly9zb2NpYWwubXNkbi5taWNyb3NvZnQuY29tL0ZvcnVtcy9pZS9lbi1VUy8zMGVmM2FkZC03NjdjLTQ0MzYtYjhhOS1mMWNhMTliNDgxMmUvaWU5LXJ0bS14ZG9tYWlucmVxdWVzdC1pc3N1ZWQtcmVxdWVzdHMtbWF5LWFib3J0LWlmLWFsbC1ldmVudC1oYW5kbGVycy1ub3Qtc3BlY2lmaWVkP2ZvcnVtPWlld2ViZGV2ZWxvcG1lbnRcbiAgICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHsgLyogbm9vcCAqLyB9O1xuICAgICAgICB4aHIub25wcm9ncmVzcyA9IGZ1bmN0aW9uICgpIHsgLyogbm9vcCAqLyB9O1xuXG4gICAgICAgIHhoci5vcGVuKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuXG4gICAgICAgIGlmIChyZXEudGltZW91dCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgdXNlIHRoZSBub3JtYWwgWEhSIHRpbWVvdXQgbWVjaGFuaXNtIChgeGhyLnRpbWVvdXRgIGFuZFxuICAgICAgICAgICAgLy8gYHhoci5vbnRpbWVvdXRgKSwgYG9ucmVhZHlzdGF0ZWNoYW5nZWAgd2lsbCBiZSB0cmlnZ2VyZWQgYmVmb3JlXG4gICAgICAgICAgICAvLyBgb250aW1lb3V0YC4gVGhlcmUncyBubyB3YXkgdG8gcmVjb2duaXplIHRoYXQgaXQgd2FzIHRyaWdnZXJlZCBieVxuICAgICAgICAgICAgLy8gYSB0aW1lb3V0LCBhbmQgd2UnZCBiZSB1bmFibGUgdG8gZGlzcGF0Y2ggdGhlIHJpZ2h0IGVycm9yLlxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVxLnRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdSZXF1ZXN0IHRpbWVvdXQnLCByZXEsIHtuYW1lOiAnVGltZW91dCd9KSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgeGhyLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7fVxuICAgICAgICAgICAgfSwgcmVxLnRpbWVvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChrIGluIHJlcS5oZWFkZXJzKSB7XG4gICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrLCByZXEuaGVhZGVyc1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB4aHIuc2VuZChyZXEuYm9keSk7XG5cbiAgICAgICAgcmV0dXJuIHJlcTtcbiAgICB9XG5cbiAgICB2YXIgbWV0aG9kLFxuICAgICAgICBtZXRob2RzID0gWydnZXQnLCAncG9zdCcsICdwdXQnLCAnaGVhZCcsICdwYXRjaCcsICdkZWxldGUnXSxcbiAgICAgICAgdmVyYiA9IGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAocmVxLCBjYikge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBSZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICAgICAgcmVxLm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaHR0cChyZXEsIGNiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgZm9yIChpID0gMDsgaSA8IG1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kc1tpXTtcbiAgICAgICAgaHR0cFttZXRob2RdID0gdmVyYihtZXRob2QpO1xuICAgIH1cblxuICAgIGh0dHAucGx1Z2lucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgfTtcblxuICAgIGh0dHAuZGVmYXVsdHMgPSBmdW5jdGlvbiAobmV3VmFsdWVzKSB7XG4gICAgICAgIGlmIChuZXdWYWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5KGV4dGVuZChkZWZhdWx0cywgbmV3VmFsdWVzKSwgcGx1Z2lucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH07XG5cbiAgICBodHRwLnVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5ld1BsdWdpbnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICByZXR1cm4gZmFjdG9yeShkZWZhdWx0cywgcGx1Z2lucy5jb25jYXQobmV3UGx1Z2lucykpO1xuICAgIH07XG5cbiAgICBodHRwLmJhcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWN0b3J5KCk7XG4gICAgfTtcblxuICAgIGh0dHAuUmVxdWVzdCA9IFJlcXVlc3Q7XG4gICAgaHR0cC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4gICAgcmV0dXJuIGh0dHA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh7fSwgW2NsZWFuVVJMXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJlcXVlc3Qob3B0c09yVXJsKSB7XG4gICAgdmFyIG9wdHMgPSB0eXBlb2Ygb3B0c09yVXJsID09PSAnc3RyaW5nJyA/IHt1cmw6IG9wdHNPclVybH0gOiBvcHRzT3JVcmwgfHwge307XG4gICAgdGhpcy5tZXRob2QgPSBvcHRzLm1ldGhvZCA/IG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCkgOiAnR0VUJztcbiAgICB0aGlzLnVybCA9IG9wdHMudXJsO1xuICAgIHRoaXMuaGVhZGVycyA9IG9wdHMuaGVhZGVycyB8fCB7fTtcbiAgICB0aGlzLmJvZHkgPSBvcHRzLmJvZHk7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0cy50aW1lb3V0IHx8IDA7XG4gICAgdGhpcy5lcnJvck9uNDA0ID0gb3B0cy5lcnJvck9uNDA0ICE9IG51bGwgPyBvcHRzLmVycm9yT240MDQgOiB0cnVlO1xuICAgIHRoaXMub25sb2FkID0gb3B0cy5vbmxvYWQ7XG4gICAgdGhpcy5vbmVycm9yID0gb3B0cy5vbmVycm9yO1xufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5hYm9ydGVkKSByZXR1cm47XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICB0aGlzLnhoci5hYm9ydCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuaGVhZGVyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGs7XG4gICAgZm9yIChrIGluIHRoaXMuaGVhZGVycykge1xuICAgICAgICBpZiAodGhpcy5oZWFkZXJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBpZiAobmFtZS50b0xvd2VyQ2FzZSgpID09PSBrLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oZWFkZXJzW2tdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmhlYWRlcnNba107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzW25hbWVdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKTtcblxuXG5mdW5jdGlvbiBSZXNwb25zZShyZXEpIHtcbiAgICB2YXIgaSwgbGluZXMsIG0sXG4gICAgICAgIHhociA9IHJlcS54aHI7XG4gICAgdGhpcy5yZXF1ZXN0ID0gcmVxO1xuICAgIHRoaXMueGhyID0geGhyO1xuICAgIHRoaXMuaGVhZGVycyA9IHt9O1xuXG4gICAgLy8gQnJvd3NlcnMgZG9uJ3QgbGlrZSB5b3UgdHJ5aW5nIHRvIHJlYWQgWEhSIHByb3BlcnRpZXMgd2hlbiB5b3UgYWJvcnQgdGhlXG4gICAgLy8gcmVxdWVzdCwgc28gd2UgZG9uJ3QuXG4gICAgaWYgKHJlcS5hYm9ydGVkIHx8IHJlcS50aW1lZE91dCkgcmV0dXJuO1xuXG4gICAgdGhpcy5zdGF0dXMgPSB4aHIuc3RhdHVzIHx8IDA7XG4gICAgdGhpcy50ZXh0ID0geGhyLnJlc3BvbnNlVGV4dDtcbiAgICB0aGlzLmJvZHkgPSB4aHIucmVzcG9uc2UgfHwgeGhyLnJlc3BvbnNlVGV4dDtcbiAgICB0aGlzLmNvbnRlbnRUeXBlID0geGhyLmNvbnRlbnRUeXBlIHx8ICh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIgJiYgeGhyLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKSk7XG5cbiAgICBpZiAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycykge1xuICAgICAgICBsaW5lcyA9IHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKChtID0gbGluZXNbaV0ubWF0Y2goL1xccyooW15cXHNdKyk6XFxzKyhbXlxcc10rKS8pKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhZGVyc1ttWzFdXSA9IG1bMl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzSHR0cEVycm9yID0gdGhpcy5zdGF0dXMgPj0gNDAwO1xufVxuXG5SZXNwb25zZS5wcm90b3R5cGUuaGVhZGVyID0gUmVxdWVzdC5wcm90b3R5cGUuaGVhZGVyO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFdyYXAgYSBmdW5jdGlvbiBpbiBhIGBzZXRUaW1lb3V0YCBjYWxsLiBUaGlzIGlzIHVzZWQgdG8gZ3VhcmFudGVlIGFzeW5jXG4vLyBiZWhhdmlvciwgd2hpY2ggY2FuIGF2b2lkIHVuZXhwZWN0ZWQgZXJyb3JzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhclxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCksXG4gICAgICAgICAgICBuZXdGdW5jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIHNldFRpbWVvdXQobmV3RnVuYywgMCk7XG4gICAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEEgXCJvbmNlXCIgdXRpbGl0eS5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHJlc3VsdCwgY2FsbGVkID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjYWxsZWQpIHtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgIHJlcS51cmwgPSByZXEudXJsLnJlcGxhY2UoL1teJV0rL2csIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJKHMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuIiwidmFyIGh0dHAgPSByZXF1aXJlKFwiaHR0cHBsZWFzZVwiKTtcbnZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xuXG50bnRfZVJlc3QgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIFByZWZpeGVzIHRvIHVzZSB0aGUgUkVTVCBBUEkuXG4gICAgLy8gVGhlc2UgYXJlIG1vZGlmaWVkIGluIHRoZSBsb2NhbFJFU1Qgc2V0dGVyXG4gICAgdmFyIHByZWZpeCA9IFwiaHR0cDovL3Jlc3QuZW5zZW1ibC5vcmdcIjtcbiAgICB2YXIgcHJlZml4X3JlZ2lvbiA9IHByZWZpeCArIFwiL292ZXJsYXAvcmVnaW9uL1wiO1xuICAgIHZhciBwcmVmaXhfZW5zZ2VuZSA9IHByZWZpeCArIFwiL2xvb2t1cC9pZC9cIjtcbiAgICB2YXIgcHJlZml4X3hyZWYgPSBwcmVmaXggKyBcIi94cmVmcy9zeW1ib2wvXCI7XG4gICAgdmFyIHByZWZpeF9ob21vbG9ndWVzID0gcHJlZml4ICsgXCIvaG9tb2xvZ3kvaWQvXCI7XG4gICAgdmFyIHByZWZpeF9jaHJfaW5mbyA9IHByZWZpeCArIFwiL2luZm8vYXNzZW1ibHkvXCI7XG4gICAgdmFyIHByZWZpeF9hbG5fcmVnaW9uID0gcHJlZml4ICsgXCIvYWxpZ25tZW50L3JlZ2lvbi9cIjtcbiAgICB2YXIgcHJlZml4X2dlbmVfdHJlZSA9IHByZWZpeCArIFwiL2dlbmV0cmVlL2lkL1wiO1xuICAgIHZhciBwcmVmaXhfYXNzZW1ibHkgPSBwcmVmaXggKyBcIi9pbmZvL2Fzc2VtYmx5L1wiO1xuXG4gICAgLy8gTnVtYmVyIG9mIGNvbm5lY3Rpb25zIG1hZGUgdG8gdGhlIGRhdGFiYXNlXG4gICAgdmFyIGNvbm5lY3Rpb25zID0gMDtcblxuICAgIHZhciBlUmVzdCA9IGZ1bmN0aW9uKCkge1xuICAgIH07XG5cbiAgICAvLyBMaW1pdHMgaW1wb3NlZCBieSB0aGUgZW5zZW1ibCBSRVNUIEFQSVxuICAgIGVSZXN0LmxpbWl0cyA9IHtcblx0cmVnaW9uIDogNTAwMDAwMFxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGVSZXN0KTtcblxuXG4gICAgLyoqIDxzdHJvbmc+bG9jYWxSRVNUPC9zdHJvbmc+IHBvaW50cyB0aGUgcXVlcmllcyB0byBhIGxvY2FsIFJFU1Qgc2VydmljZSB0byBkZWJ1Zy5cblx0VE9ETzogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIHJlbW92ZWQgaW4gXCJwcm9kdWN0aW9uXCJcbiAgICAqL1xuICAgIGFwaS5tZXRob2QgKCdsb2NhbFJFU1QnLCBmdW5jdGlvbigpIHtcblx0cHJlZml4ID0gXCJodHRwOi8vMTI3LjAuMC4xOjMwMDBcIjtcblx0cHJlZml4X3JlZ2lvbiA9IHByZWZpeCArIFwiL292ZXJsYXAvcmVnaW9uL1wiO1xuXHRwcmVmaXhfZW5zZ2VuZSA9IHByZWZpeCArIFwiL2xvb2t1cC9pZC9cIjtcblx0cHJlZml4X3hyZWYgPSBwcmVmaXggKyBcIi94cmVmcy9zeW1ib2wvXCI7XG5cdHByZWZpeF9ob21vbG9ndWVzID0gcHJlZml4ICsgXCIvaG9tb2xvZ3kvaWQvXCI7XG5cblx0cmV0dXJuIGVSZXN0O1xuICAgIH0pO1xuXG4gICAgLyoqIDxzdHJvbmc+Y2FsbDwvc3Ryb25nPiBtYWtlcyBhbiBhc3luY2hyb25vdXMgY2FsbCB0byB0aGUgZW5zZW1ibCBSRVNUIHNlcnZpY2UuXG5cdEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBBIGxpdGVyYWwgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBmaWVsZHM6XG5cdDx1bD5cblx0PGxpPnVybCA9PiBUaGUgcmVzdCBVUkwuIFRoaXMgaXMgcmV0dXJuZWQgYnkge0BsaW5rIGVSZXN0LnVybH08L2xpPlxuXHQ8bGk+c3VjY2VzcyA9PiBBIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBSRVNUIHF1ZXJ5IGlzIHN1Y2Nlc3NmdWwgKGkuZS4gdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBpcyBhIGRlZmluZWQgdmFsdWUgYW5kIG5vIGVycm9yIGhhcyBiZWVuIHJldHVybmVkKTwvbGk+XG5cdDxsaT5lcnJvciA9PiBBIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBSRVNUIHF1ZXJ5IHJldHVybnMgYW4gZXJyb3Jcblx0PC91bD5cbiAgICAqL1xuICAgIGFwaS5tZXRob2QgKCdjYWxsJywgZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdXJsID0gb2JqLnVybDtcblx0dmFyIG9uX3N1Y2Nlc3MgPSBvYmouc3VjY2Vzcztcblx0dmFyIG9uX2Vycm9yICAgPSBvYmouZXJyb3I7XG5cdGNvbm5lY3Rpb25zKys7XG5cdGh0dHAuZ2V0KHtcblx0ICAgIFwidXJsXCIgOiB1cmxcblx0fSwgZnVuY3Rpb24gKGVycm9yLCByZXNwKSB7XG5cdCAgICBpZiAocmVzcCAhPT0gdW5kZWZpbmVkICYmIGVycm9yID09IG51bGwgJiYgb25fc3VjY2VzcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0b25fc3VjY2VzcyhKU09OLnBhcnNlKHJlc3AuYm9keSkpO1xuXHQgICAgfVxuXHQgICAgaWYgKGVycm9yICE9PSBudWxsICYmIG9uX2Vycm9yICE9PSB1bmRlZmluZWQpIHtcblx0XHRvbl9lcnJvcihlcnJvcik7XG5cdCAgICB9XG5cdH0pO1xuXHQvLyBkMy5qc29uICh1cmwsIGZ1bmN0aW9uIChlcnJvciwgcmVzcCkge1xuXHQvLyAgICAgY29ubmVjdGlvbnMtLTtcblx0Ly8gICAgIGlmIChyZXNwICE9PSB1bmRlZmluZWQgJiYgZXJyb3IgPT09IG51bGwgJiYgb25fc3VjY2VzcyAhPT0gdW5kZWZpbmVkKSB7XG5cdC8vIFx0b25fc3VjY2VzcyhyZXNwKTtcblx0Ly8gICAgIH1cblx0Ly8gICAgIGlmIChlcnJvciAhPT0gbnVsbCAmJiBvbl9lcnJvciAhPT0gdW5kZWZpbmVkKSB7XG5cdC8vIFx0b25fZXJyb3IoZXJyb3IpO1xuXHQvLyAgICAgfVxuXHQvLyB9KTtcbiAgICB9KTtcblxuXG4gICAgZVJlc3QudXJsID0ge307XG4gICAgdmFyIHVybF9hcGkgPSBhcGlqcyAoZVJlc3QudXJsKTtcblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPnJlZ2lvbjwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBnZW5lcyBpbmNsdWRlZCBpbiB0aGUgc3BlY2lmaWVkIHJlZ2lvblxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyA6IFRoZSBzcGVjaWVzIHRoZSByZWdpb24gcmVmZXJzIHRvPC9saT5cbjxsaT5jaHIgICAgIDogVGhlIGNociAob3Igc2VxX3JlZ2lvbiBuYW1lKTwvbGk+XG48bGk+ZnJvbSAgICA6IFRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgcmVnaW9uIGluIHRoZSBjaHI8L2xpPlxuPGxpPnRvICAgICAgOiBUaGUgZW5kIHBvc2l0aW9uIG9mIHRoZSByZWdpb24gKGZyb20gPCB0byBhbHdheXMpPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvZmVhdHVyZS9yZWdpb24vaG9tb19zYXBpZW5zLzEzOjMyODg5NjExLTMyOTczODA1Lmpzb24/ZmVhdHVyZT1nZW5lfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5yZWdpb24gKHsgc3BlY2llcyA6IFwiaG9tb19zYXBpZW5zXCIsIGNociA6IFwiMTNcIiwgZnJvbSA6IDMyODg5NjExLCB0byA6IDMyOTczODA1IH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdyZWdpb24nLCBmdW5jdGlvbihvYmopIHtcblx0cmV0dXJuIHByZWZpeF9yZWdpb24gK1xuXHQgICAgb2JqLnNwZWNpZXMgK1xuXHQgICAgXCIvXCIgK1xuXHQgICAgb2JqLmNociArXG5cdCAgICBcIjpcIiArIFxuXHQgICAgb2JqLmZyb20gKyBcblx0ICAgIFwiLVwiICsgb2JqLnRvICsgXG5cdCAgICBcIi5qc29uP2ZlYXR1cmU9Z2VuZVwiO1xuICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5zcGVjaWVzX2dlbmU8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZW5zZW1ibCBnZW5lIGFzc29jaWF0ZWQgd2l0aFxuXHQgICAgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIHNwZWNpZmllZCBzcGVjaWVzLlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyAgIDogVGhlIHNwZWNpZXMgdGhlIHJlZ2lvbiByZWZlcnMgdG88L2xpPlxuPGxpPmdlbmVfbmFtZSA6IFRoZSBuYW1lIG9mIHRoZSBnZW5lPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcveHJlZnMvc3ltYm9sL2h1bWFuL0JSQ0EyLmpzb24/b2JqZWN0X3R5cGU9Z2VuZXxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuc3BlY2llc19nZW5lICh7IHNwZWNpZXMgOiBcImh1bWFuXCIsIGdlbmVfbmFtZSA6IFwiQlJDQTJcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgneHJlZicsIGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuIHByZWZpeF94cmVmICtcblx0ICAgIG9iai5zcGVjaWVzICArXG5cdCAgICBcIi9cIiArXG5cdCAgICBvYmoubmFtZSArXG5cdCAgICBcIi5qc29uP29iamVjdF90eXBlPWdlbmVcIjtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+aG9tb2xvZ3Vlczwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBob21vbG9ndWVzIChvcnRob2xvZ3VlcyArIHBhcmFsb2d1ZXMpIG9mIHRoZSBnaXZlbiBlbnNlbWJsIElELlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+aWQgOiBUaGUgRW5zZW1ibCBJRCBvZiB0aGUgZ2VuZTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL2hvbW9sb2d5L2lkL0VOU0cwMDAwMDEzOTYxOC5qc29uP2Zvcm1hdD1jb25kZW5zZWQ7c2VxdWVuY2U9bm9uZTt0eXBlPWFsbHxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuaG9tb2xvZ3VlcyAoeyBpZCA6IFwiRU5TRzAwMDAwMTM5NjE4XCIgfSksXG4gICAgICAgICAgICAgc3VjY2VzcyA6IGNhbGxiYWNrLFxuICAgICAgICAgICAgIGVycm9yICAgOiBjYWxsYmFja1xuXHQgICApO1xuXHQgKi9cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2hvbW9sb2d1ZXMnLCBmdW5jdGlvbihvYmopIHtcblx0cmV0dXJuIHByZWZpeF9ob21vbG9ndWVzICtcblx0ICAgIG9iai5pZCArIFxuXHQgICAgXCIuanNvbj9mb3JtYXQ9Y29uZGVuc2VkO3NlcXVlbmNlPW5vbmU7dHlwZT1hbGxcIjtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+Z2VuZTwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBlbnNlbWJsIGdlbmUgYXNzb2NpYXRlZCB3aXRoXG5cdCAgICB0aGUgZ2l2ZW4gSURcblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPmlkIDogVGhlIG5hbWUgb2YgdGhlIGdlbmU8L2xpPlxuPC91bD5cbiAgICAgICAgICAgIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHVybCB0byBxdWVyeSB0aGUgRW5zZW1ibCBSRVNUIHNlcnZlci4gRm9yIGFuIGV4YW1wbGUgb2Ygb3V0cHV0IG9mIHRoZXNlIHVybHMgc2VlIHRoZSB7QGxpbmsgaHR0cDovL2JldGEucmVzdC5lbnNlbWJsLm9yZy9sb29rdXAvRU5TRzAwMDAwMTM5NjE4Lmpzb24/Zm9ybWF0PWZ1bGx8RW5zZW1ibCBSRVNUIEFQSSBleGFtcGxlfVxuXHQgICAgQGV4YW1wbGVcbmVSZXN0LmNhbGwgKCB1cmwgICAgIDogZVJlc3QudXJsLmdlbmUgKHsgaWQgOiBcIkVOU0cwMDAwMDEzOTYxOFwiIH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdnZW5lJywgZnVuY3Rpb24ob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfZW5zZ2VuZSArXG5cdCAgICBvYmouaWQgK1xuXHQgICAgXCIuanNvbj9mb3JtYXQ9ZnVsbFwiO1xuICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5jaHJfaW5mbzwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBpbmZvcm1hdGlvbiBhc3NvY2lhdGVkIHdpdGggdGhlIGNocm9tb3NvbWUgKHNlcV9yZWdpb24gaW4gRW5zZW1ibCBub21lbmNsYXR1cmUpLlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyA6IFRoZSBzcGVjaWVzIHRoZSBjaHIgKG9yIHNlcV9yZWdpb24pIGJlbG9uZ3MgdG9cbjxsaT5jaHIgICAgIDogVGhlIG5hbWUgb2YgdGhlIGNociAob3Igc2VxX3JlZ2lvbik8L2xpPlxuPC91bD5cbiAgICAgICAgICAgIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHVybCB0byBxdWVyeSB0aGUgRW5zZW1ibCBSRVNUIHNlcnZlci4gRm9yIGFuIGV4YW1wbGUgb2Ygb3V0cHV0IG9mIHRoZXNlIHVybHMgc2VlIHRoZSB7QGxpbmsgaHR0cDovL2JldGEucmVzdC5lbnNlbWJsLm9yZy9hc3NlbWJseS9pbmZvL2hvbW9fc2FwaWVucy8xMy5qc29uP2Zvcm1hdD1mdWxsfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5jaHJfaW5mbyAoeyBzcGVjaWVzIDogXCJob21vX3NhcGllbnNcIiwgY2hyIDogXCIxM1wiIH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdjaHJfaW5mbycsIGZ1bmN0aW9uKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X2Nocl9pbmZvICtcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiL1wiICtcblx0ICAgIG9iai5jaHIgK1xuXHQgICAgXCIuanNvbj9mb3JtYXQ9ZnVsbFwiO1xuICAgIH0pO1xuXG5cdC8vIFRPRE86IEZvciBub3csIGl0IG9ubHkgd29ya3Mgd2l0aCBzcGVjaWVzX3NldCBhbmQgbm90IHNwZWNpZXNfc2V0X2dyb3Vwc1xuXHQvLyBTaG91bGQgYmUgZXh0ZW5kZWQgZm9yIHdpZGVyIHVzZVxuICAgIHVybF9hcGkubWV0aG9kICgnYWxuX2Jsb2NrJywgZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdXJsID0gcHJlZml4X2Fsbl9yZWdpb24gKyBcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiL1wiICtcblx0ICAgIG9iai5jaHIgK1xuXHQgICAgXCI6XCIgK1xuXHQgICAgb2JqLmZyb20gK1xuXHQgICAgXCItXCIgK1xuXHQgICAgb2JqLnRvICtcblx0ICAgIFwiLmpzb24/bWV0aG9kPVwiICtcblx0ICAgIG9iai5tZXRob2Q7XG5cblx0Zm9yICh2YXIgaT0wOyBpPG9iai5zcGVjaWVzX3NldC5sZW5ndGg7IGkrKykge1xuXHQgICAgdXJsICs9IFwiJnNwZWNpZXNfc2V0PVwiICsgb2JqLnNwZWNpZXNfc2V0W2ldO1xuXHR9XG5cblx0cmV0dXJuIHVybDtcbiAgICB9KTtcblxuICAgIHVybF9hcGkubWV0aG9kICgnZ2VuZV90cmVlJywgZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X2dlbmVfdHJlZSArXG5cdCAgICBvYmouaWQgKyBcblx0ICAgIFwiLmpzb24/c2VxdWVuY2U9XCIgK1xuXHQgICAgKChvYmouc2VxdWVuY2UgfHwgb2JqLmFsaWduZWQpID8gMSA6IFwibm9uZVwiKSArXG5cdCAgICAob2JqLmFsaWduZWQgPyAnJmFsaWduZWQ9MScgOiAnJyk7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCgnYXNzZW1ibHknLCBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfYXNzZW1ibHkgKyBcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiLmpzb25cIjtcbiAgICB9KTtcblxuXG4gICAgYXBpLm1ldGhvZCAoJ2Nvbm5lY3Rpb25zJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBjb25uZWN0aW9ucztcbiAgICB9KTtcblxuICAgIHJldHVybiBlUmVzdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9lUmVzdDtcbiIsIm1vZHVsZS5leHBvcnRzID0gdG9vbHRpcCA9IHJlcXVpcmUoXCIuL3NyYy90b29sdGlwLmpzXCIpO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG5cbnZhciB0b29sdGlwID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKCk7XG4gICAgdmFyIHRvb2x0aXBfZGl2O1xuXG4gICAgdmFyIGNvbmYgPSB7XG5cdGJhY2tncm91bmRfY29sb3IgOiBcIndoaXRlXCIsXG5cdGZvcmVncm91bmRfY29sb3IgOiBcImJsYWNrXCIsXG5cdHBvc2l0aW9uIDogXCJyaWdodFwiLFxuXHRhbGxvd19kcmFnIDogdHJ1ZSxcblx0c2hvd19jbG9zZXIgOiB0cnVlLFxuXHRmaWxsIDogZnVuY3Rpb24gKCkgeyB0aHJvdyBcImZpbGwgaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2Ugb2JqZWN0XCI7IH0sXG5cdHdpZHRoIDogMTgwLFxuXHRpZCA6IDFcbiAgICB9O1xuXG4gICAgdmFyIHQgPSBmdW5jdGlvbiAoZGF0YSwgZXZlbnQpIHtcblx0ZHJhZ1xuXHQgICAgLm9yaWdpbihmdW5jdGlvbigpe1xuXHRcdHJldHVybiB7eDpwYXJzZUludChkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJsZWZ0XCIpKSxcblx0XHRcdHk6cGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwidG9wXCIpKVxuXHRcdCAgICAgICB9O1xuXHQgICAgfSlcblx0ICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbmYuYWxsb3dfZHJhZykge1xuXHRcdCAgICBkMy5zZWxlY3QodGhpcylcblx0XHRcdC5zdHlsZShcImxlZnRcIiwgZDMuZXZlbnQueCArIFwicHhcIilcblx0XHRcdC5zdHlsZShcInRvcFwiLCBkMy5ldmVudC55ICsgXCJweFwiKTtcblx0XHR9XG5cdCAgICB9KTtcblxuXHQvLyBUT0RPOiBXaHkgZG8gd2UgbmVlZCB0aGUgZGl2IGVsZW1lbnQ/XG5cdC8vIEl0IGxvb2tzIGxpa2UgaWYgd2UgYW5jaG9yIHRoZSB0b29sdGlwIGluIHRoZSBcImJvZHlcIlxuXHQvLyBUaGUgdG9vbHRpcCBpcyBub3QgbG9jYXRlZCBpbiB0aGUgcmlnaHQgcGxhY2UgKGFwcGVhcnMgYXQgdGhlIGJvdHRvbSlcblx0Ly8gU2VlIGNsaWVudHMvdG9vbHRpcHNfdGVzdC5odG1sIGZvciBhbiBleGFtcGxlXG5cdHZhciBjb250YWluZXJFbGVtID0gc2VsZWN0QW5jZXN0b3IgKHRoaXMsIFwiZGl2XCIpO1xuXHRpZiAoY29udGFpbmVyRWxlbSA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICAvLyBXZSByZXF1aXJlIGEgZGl2IGVsZW1lbnQgYXQgc29tZSBwb2ludCB0byBhbmNob3IgdGhlIHRvb2x0aXBcblx0ICAgIHJldHVybjtcblx0fVxuXG5cdC8vIENvbnRhaW5lciBlbGVtZW50IHBvc2l0aW9uIChuZWVkZWQgZm9yIFwicmVsYXRpdmVcIiBwb3NpdGlvbmVkIHBhcmVudHMpXG5cdHZhciBlbGVtUG9zID0gY29udGFpbmVyRWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0dmFyIGVsZW1Ub3AgPSBlbGVtUG9zLnRvcCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wO1xuXHR2YXIgZWxlbUxlZnQgPSBlbGVtUG9zLmxlZnQgKyBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQ7XG5cdFxuXHR0b29sdGlwX2RpdiA9IGQzLnNlbGVjdChjb250YWluZXJFbGVtKVxuXHQgICAgLmFwcGVuZChcImRpdlwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF90b29sdGlwXCIpXG5cdCAgICAuY2xhc3NlZChcInRudF90b29sdGlwX2FjdGl2ZVwiLCB0cnVlKSAgLy8gVE9ETzogSXMgdGhpcyBuZWVkZWQvdXNlZD8/P1xuXHQgICAgLmNhbGwoZHJhZyk7XG5cblx0Ly8gcHJldiB0b29sdGlwcyB3aXRoIHRoZSBzYW1lIGhlYWRlclxuXHRkMy5zZWxlY3QoXCIjdG50X3Rvb2x0aXBfXCIgKyBjb25mLmlkKS5yZW1vdmUoKTtcblxuXHRpZiAoKGQzLmV2ZW50ID09PSBudWxsKSAmJiAoZXZlbnQpKSB7XG5cdCAgICBkMy5ldmVudCA9IGV2ZW50O1xuXHR9XG5cdHZhciBtb3VzZSA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldO1xuXHRkMy5ldmVudCA9IG51bGw7XG5cblx0dmFyIG9mZnNldCA9IDA7XG5cdGlmIChjb25mLnBvc2l0aW9uID09PSBcImxlZnRcIikge1xuXHQgICAgb2Zmc2V0ID0gY29uZi53aWR0aDtcblx0fVxuXHRcblx0dG9vbHRpcF9kaXYuYXR0cihcImlkXCIsIFwidG50X3Rvb2x0aXBfXCIgKyBjb25mLmlkKTtcblx0XG5cdC8vIFdlIHBsYWNlIHRoZSB0b29sdGlwXG5cdHRvb2x0aXBfZGl2XG5cdCAgICAuc3R5bGUoXCJsZWZ0XCIsIChtb3VzZVswXSAtIG9mZnNldCAtIGVsZW1MZWZ0KSArIFwicHhcIilcblx0ICAgIC5zdHlsZShcInRvcFwiLCBtb3VzZVsxXSAtIGVsZW1Ub3AgKyBcInB4XCIpO1xuXG5cdC8vIENsb3NlXG5cdGlmIChjb25mLnNob3dfY2xvc2VyKSB7XG5cdCAgICB0b29sdGlwX2Rpdi5hcHBlbmQoXCJzcGFuXCIpXG5cdFx0LnN0eWxlKFwicG9zaXRpb25cIiwgXCJhYnNvbHV0ZVwiKVxuXHRcdC5zdHlsZShcInJpZ2h0XCIsIFwiLTEwcHhcIilcblx0XHQuc3R5bGUoXCJ0b3BcIiwgXCItMTBweFwiKVxuXHRcdC5hcHBlbmQoXCJpbWdcIilcblx0XHQuYXR0cihcInNyY1wiLCB0b29sdGlwLmltYWdlcy5jbG9zZSlcblx0XHQuYXR0cihcIndpZHRoXCIsIFwiMjBweFwiKVxuXHRcdC5hdHRyKFwiaGVpZ2h0XCIsIFwiMjBweFwiKVxuXHRcdC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcblx0XHQgICAgdC5jbG9zZSgpO1xuXHRcdH0pO1xuXHR9XG5cblx0Y29uZi5maWxsLmNhbGwodG9vbHRpcF9kaXYsIGRhdGEpO1xuXG5cdC8vIHJldHVybiB0aGlzIGhlcmU/XG5cdHJldHVybiB0O1xuICAgIH07XG5cbiAgICAvLyBnZXRzIHRoZSBmaXJzdCBhbmNlc3RvciBvZiBlbGVtIGhhdmluZyB0YWduYW1lIFwidHlwZVwiXG4gICAgLy8gZXhhbXBsZSA6IHZhciBteWRpdiA9IHNlbGVjdEFuY2VzdG9yKG15ZWxlbSwgXCJkaXZcIik7XG4gICAgZnVuY3Rpb24gc2VsZWN0QW5jZXN0b3IgKGVsZW0sIHR5cGUpIHtcblx0dHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcblx0aWYgKGVsZW0ucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuXHQgICAgY29uc29sZS5sb2coXCJObyBtb3JlIHBhcmVudHNcIik7XG5cdCAgICByZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cdHZhciB0YWdOYW1lID0gZWxlbS5wYXJlbnROb2RlLnRhZ05hbWU7XG5cblx0aWYgKCh0YWdOYW1lICE9PSB1bmRlZmluZWQpICYmICh0YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IHR5cGUpKSB7XG5cdCAgICByZXR1cm4gZWxlbS5wYXJlbnROb2RlO1xuXHR9IGVsc2Uge1xuXHQgICAgcmV0dXJuIHNlbGVjdEFuY2VzdG9yIChlbGVtLnBhcmVudE5vZGUsIHR5cGUpO1xuXHR9XG4gICAgfVxuICAgIFxuICAgIHZhciBhcGkgPSBhcGlqcyh0KVxuXHQuZ2V0c2V0KGNvbmYpO1xuICAgIGFwaS5jaGVjaygncG9zaXRpb24nLCBmdW5jdGlvbiAodmFsKSB7XG5cdHJldHVybiAodmFsID09PSAnbGVmdCcpIHx8ICh2YWwgPT09ICdyaWdodCcpO1xuICAgIH0sIFwiT25seSAnbGVmdCcgb3IgJ3JpZ2h0JyB2YWx1ZXMgYXJlIGFsbG93ZWQgZm9yIHBvc2l0aW9uXCIpO1xuXG4gICAgYXBpLm1ldGhvZCgnY2xvc2UnLCBmdW5jdGlvbiAoKSB7XG5cdHRvb2x0aXBfZGl2LnJlbW92ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHRhYmxlIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG4gICAgXG4gICAgdmFyIHdpZHRoID0gMTgwO1xuXG4gICAgdC5maWxsIChmdW5jdGlvbiAob2JqKSB7XG5cdHZhciB0b29sdGlwX2RpdiA9IHRoaXM7XG5cblx0dmFyIG9ial9pbmZvX3RhYmxlID0gdG9vbHRpcF9kaXZcblx0ICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuXHQgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuXHQvLyBUb29sdGlwIGhlYWRlclxuXHRvYmpfaW5mb190YWJsZVxuXHQgICAgLmFwcGVuZChcInRyXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X2hlYWRlclwiKVxuXHQgICAgLmFwcGVuZChcInRoXCIpXG5cdCAgICAuYXR0cihcImNvbHNwYW5cIiwgMilcblx0ICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuXG5cdC8vIFRvb2x0aXAgcm93c1xuXHR2YXIgdGFibGVfcm93cyA9IG9ial9pbmZvX3RhYmxlLnNlbGVjdEFsbChcIi50bnRfem1lbnVfcm93XCIpXG5cdCAgICAuZGF0YShvYmoucm93cylcblx0ICAgIC5lbnRlcigpXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpO1xuXG5cdHRhYmxlX3Jvd3Ncblx0ICAgIC5hcHBlbmQoXCJ0aFwiKVxuXHQgICAgLmh0bWwoZnVuY3Rpb24oZCxpKSB7XG5cdFx0cmV0dXJuIG9iai5yb3dzW2ldLmxhYmVsO1xuXHQgICAgfSk7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRkXCIpXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0udmFsdWU7XG5cdCAgICB9KVxuXHQgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZC5saW5rID09PSB1bmRlZmluZWQpIHtcblx0XHQgICAgcmV0dXJuO1xuXHRcdH1cblx0XHRkMy5zZWxlY3QodGhpcylcblx0XHQgICAgLmNsYXNzZWQoXCJsaW5rXCIsIDEpXG5cdFx0ICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuXHRcdFx0ZC5saW5rKGQub2JqKTtcblx0XHRcdHQuY2xvc2UuY2FsbCh0aGlzKTtcblx0XHQgICAgfSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxudG9vbHRpcC5wbGFpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBwbGFpbiB0b29sdGlwcyBhcmUgYmFzZWQgb24gZ2VuZXJhbCB0b29sdGlwc1xuICAgIHZhciB0ID0gdG9vbHRpcCgpO1xuXG4gICAgdC5maWxsIChmdW5jdGlvbiAob2JqKSB7XG5cdHZhciB0b29sdGlwX2RpdiA9IHRoaXM7XG5cblx0dmFyIG9ial9pbmZvX3RhYmxlID0gdG9vbHRpcF9kaXZcblx0ICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuXHQgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuXHRvYmpfaW5mb190YWJsZVxuXHQgICAgLmFwcGVuZChcInRyXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X2hlYWRlclwiKVxuXHQgICAgLmFwcGVuZChcInRoXCIpXG5cdCAgICAudGV4dChvYmouaGVhZGVyKTtcblxuXHRvYmpfaW5mb190YWJsZVxuXHQgICAgLmFwcGVuZChcInRyXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X3Jvd1wiKVxuXHQgICAgLmFwcGVuZChcInRkXCIpXG5cdCAgICAuc3R5bGUoXCJ0ZXh0LWFsaWduXCIsIFwiY2VudGVyXCIpXG5cdCAgICAuaHRtbChvYmouYm9keSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbi8vIFRPRE86IFRoaXMgc2hvdWxkbid0IGJlIGV4cG9zZWQgaW4gdGhlIEFQSS4gSXQgd291bGQgYmUgYmV0dGVyIHRvIGhhdmUgYXMgYSBsb2NhbCB2YXJpYWJsZVxuLy8gb3IgYWx0ZXJuYXRpdmVseSBoYXZlIHRoZSBpbWFnZXMgc29tZXdoZXJlIGVsc2UgKGFsdGhvdWdoIHRoZSBudW1iZXIgb2YgaGFyZGNvZGVkIGltYWdlcyBzaG91bGQgYmUgbGVmdCBhdCBhIG1pbmltdW0pXG50b29sdGlwLmltYWdlcyA9IHt9O1xudG9vbHRpcC5pbWFnZXMuY2xvc2UgPSAnZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFRQUFBQUVBQ0FZQUFBQmNjcWhtQUFBS1EybERRMUJKUTBNZ2NISnZabWxzWlFBQWVOcWRVM2RZay9jV1B0LzNaUTlXUXRqd3NaZHNnUUFpSTZ3SXlCQlpvaENTQUdHRUVCSkF4WVdJQ2xZVUZSR2NTRlhFZ3RVS1NKMkk0cUFvdUdkQmlvaGFpMVZjT080ZjNLZTFmWHJ2N2UzNzEvdTg1NXpuL001NXp3K0FFUklta2VhaWFnQTVVb1U4T3RnZmowOUl4TW05Z0FJVlNPQUVJQkRteThKbkJjVUFBUEFEZVhoK2RMQS8vQUd2YndBQ0FIRFZMaVFTeCtIL2c3cFFKbGNBSUpFQTRDSVM1d3NCa0ZJQXlDNVV5QlFBeUJnQXNGT3paQW9BbEFBQWJIbDhRaUlBcWcwQTdQUkpQZ1VBMkttVDNCY0EyS0ljcVFnQWpRRUFtU2hISkFKQXV3QmdWWUZTTEFMQXdnQ2dyRUFpTGdUQXJnR0FXYll5UndLQXZRVUFkbzVZa0E5QVlBQ0FtVUlzekFBZ09BSUFReDRUelFNZ1RBT2dNTksvNEtsZmNJVzRTQUVBd011VnpaZEwwak1VdUpYUUduZnk4T0RpSWVMQ2JMRkNZUmNwRUdZSjVDS2NsNXNqRTBqbkEwek9EQUFBR3ZuUndmNDRQNURuNXVUaDVtYm5iTy8weGFMK2EvQnZJajRoOGQvK3ZJd0NCQUFRVHMvdjJsL2w1ZFlEY01jQnNIVy9hNmxiQU5wV0FHamYrVjB6MndtZ1dnclFldm1MZVRqOFFCNmVvVkRJUEIwY0Nnc0w3U1Zpb2IwdzQ0cysvelBoYitDTGZ2YjhRQjcrMjNyd0FIR2FRSm10d0tPRC9YRmhibmF1VW83bnl3UkNNVzczNXlQK3g0Vi8vWTRwMGVJMHNWd3NGWXJ4V0ltNFVDSk54M201VXBGRUljbVY0aExwZnpMeEg1YjlDWk4zRFFDc2hrL0FUcllIdGN0c3dIN3VBUUtMRGxqU2RnQkFmdk10akJvTGtRQVFaelF5ZWZjQUFKTy8rWTlBS3dFQXpaZWs0d0FBdk9nWVhLaVVGMHpHQ0FBQVJLQ0JLckJCQnd6QkZLekFEcHpCSGJ6QUZ3SmhCa1JBRENUQVBCQkNCdVNBSEFxaEdKWkJHVlRBT3RnRXRiQURHcUFSbXVFUXRNRXhPQTNuNEJKY2dldHdGd1pnR0o3Q0dMeUdDUVJCeUFnVFlTRTZpQkZpanRnaXpnZ1htWTRFSW1GSU5KS0FwQ0RwaUJSUklzWEljcVFDcVVKcWtWMUlJL0l0Y2hRNWpWeEErcERieUNBeWl2eUt2RWN4bElHeVVRUFVBblZBdWFnZkdvckdvSFBSZERRUFhZQ1dvbXZSR3JRZVBZQzJvcWZSUytoMWRBQjlpbzVqZ05FeERtYU0yV0ZjaklkRllJbFlHaWJIRm1QbFdEVldqelZqSFZnM2RoVWJ3SjVoN3dna0FvdUFFK3dJWG9RUXdteUNrSkJIV0V4WVE2Z2w3Q08wRXJvSVZ3bURoREhDSnlLVHFFKzBKWG9TK2NSNFlqcXhrRmhHckNidUlSNGhuaVZlSnc0VFg1TklKQTdKa3VST0NpRWxrREpKQzBsclNOdElMYVJUcEQ3U0VHbWNUQ2Jya0czSjN1UUlzb0NzSUplUnQ1QVBrRStTKzhuRDVMY1VPc1dJNGt3Sm9pUlNwSlFTU2pWbFArVUVwWjh5UXBtZ3FsSE5xWjdVQ0txSU9wOWFTVzJnZGxBdlU0ZXBFelIxbWlYTm14WkR5NlF0bzlYUW1tbG5hZmRvTCtsMHVnbmRneDVGbDlDWDBtdm9CK25uNllQMGR3d05oZzJEeDBoaUtCbHJHWHNacHhpM0dTK1pUS1lGMDVlWnlGUXcxeklibVdlWUQ1aHZWVmdxOWlwOEZaSEtFcFU2bFZhVmZwWG5xbFJWYzFVLzFYbXFDMVNyVlErclhsWjlwa1pWczFEanFRblVGcXZWcVIxVnU2azJyczVTZDFLUFVNOVJYNk8rWC8yQyttTU5zb2FGUnFDR1NLTlVZN2ZHR1kwaEZzWXlaZkZZUXRaeVZnUHJMR3VZVFdKYnN2bnNUSFlGK3h0MkwzdE1VME56cW1hc1pwRm1uZVp4elFFT3hySGc4RG5abkVyT0ljNE56bnN0QXkwL0xiSFdhcTFtclg2dE45cDYycjdhWXUxeTdSYnQ2OXJ2ZFhDZFFKMHNuZlU2YlRyM2RRbTZOcnBSdW9XNjIzWFA2ajdUWSt0NTZRbjF5dlVPNmQzUlIvVnQ5S1AxRitydjF1L1JIemN3TkFnMmtCbHNNVGhqOE15UVkraHJtR200MGZDRTRhZ1J5Mmk2a2NSb285RkpveWU0SnU2SForTTFlQmMrWnF4dkhHS3NOTjVsM0dzOFlXSnBNdHVreEtURjVMNHB6WlJybW1hNjBiVFRkTXpNeUN6Y3JOaXN5ZXlPT2RXY2E1NWh2dG04Mi95TmhhVkZuTVZLaXphTHg1YmFsbnpMQlpaTmx2ZXNtRlkrVm5sVzlWYlhyRW5XWE9zczYyM1dWMnhRRzFlYkRKczZtOHUycUsyYnJjUjJtMjNmRk9JVWp5blNLZlZUYnRveDdQenNDdXlhN0FidE9mWmg5aVgyYmZiUEhjd2NFaDNXTzNRN2ZISjBkY3gyYkhDODY2VGhOTU9weEtuRDZWZG5HMmVoYzUzek5SZW1TNURMRXBkMmx4ZFRiYWVLcDI2ZmVzdVY1UnJ1dXRLMTAvV2ptN3ViM0szWmJkVGR6RDNGZmF2N1RTNmJHOGxkd3ozdlFmVHc5MWppY2N6am5hZWJwOEx6a09jdlhuWmVXVjc3dlI1UHM1d21udFl3YmNqYnhGdmd2Y3Q3WURvK1BXWDZ6dWtEUHNZK0FwOTZuNGUrcHI0aTN6MitJMzdXZnBsK0IveWUrenY2eS8yUCtML2hlZklXOFU0RllBSEJBZVVCdllFYWdiTURhd01mQkprRXBRYzFCWTBGdXdZdkRENFZRZ3dKRFZrZmNwTnZ3QmZ5Ry9sak05eG5MSnJSRmNvSW5SVmFHL293ekNaTUh0WVJqb2JQQ044UWZtK20rVXpwekxZSWlPQkhiSWk0SDJrWm1SZjVmUlFwS2pLcUx1cFJ0Rk4wY1hUM0xOYXM1Rm43WjcyTzhZK3BqTGs3MjJxMmNuWm5yR3BzVW14ajdKdTRnTGlxdUlGNGgvaEY4WmNTZEJNa0NlMko1TVRZeEQySjQzTUM1MnlhTTV6a21sU1dkR091NWR5aXVSZm02YzdMbm5jOFdUVlprSHc0aFpnU2w3SS81WU1nUWxBdkdFL2xwMjVOSFJQeWhKdUZUMFcrb28yaVViRzN1RW84a3VhZFZwWDJPTjA3ZlVQNmFJWlBSblhHTXdsUFVpdDVrUm1TdVNQelRWWkUxdDZzejlseDJTMDVsSnlVbktOU0RXbVd0Q3ZYTUxjb3QwOW1LeXVURGVSNTVtM0tHNU9IeXZma0kvbHo4OXNWYklWTTBhTzBVcTVRRGhaTUw2Z3JlRnNZVzNpNFNMMUlXdFF6MzJiKzZ2a2pDNElXZkwyUXNGQzRzTFBZdUhoWjhlQWl2MFc3RmlPTFV4ZDNMakZkVXJwa2VHbncwbjNMYU11eWx2MVE0bGhTVmZKcWVkenlqbEtEMHFXbFF5dUNWelNWcVpUSnkyNnU5RnE1WXhWaGxXUlY3MnFYMVZ0V2Z5b1hsVitzY0t5b3J2aXdScmptNGxkT1g5Vjg5WGx0MnRyZVNyZks3ZXRJNjZUcmJxejNXYit2U3IxcVFkWFFodkFOclJ2eGplVWJYMjFLM25TaGVtcjFqczIwemNyTkF6VmhOZTFiekxhczIvS2hOcVAyZXAxL1hjdFcvYTJydDc3Wkp0cld2OTEzZS9NT2d4MFZPOTd2bE95OHRTdDRWMnU5UlgzMWJ0THVndDJQR21JYnVyL21mdDI0UjNkUHhaNlBlNlY3Qi9aRjcrdHFkRzlzM0srL3Y3SUpiVkkyalI1SU9uRGxtNEJ2MnB2dG1uZTFjRm9xRHNKQjVjRW4zNlo4ZStOUTZLSE93OXpEemQrWmY3ZjFDT3RJZVN2U09yOTFyQzJqYmFBOW9iM3Y2SXlqblIxZUhVZSt0LzkrN3pIalkzWEhOWTlYbnFDZEtEM3grZVNDaytPblpLZWVuVTQvUGRTWjNIbjNUUHlaYTExUlhiMW5ROCtlUHhkMDdreTNYL2ZKODk3bmoxM3d2SEQwSXZkaTJ5VzNTNjA5cmoxSGZuRDk0VWl2VzIvclpmZkw3VmM4cm5UMFRlczcwZS9UZi9wcXdOVnoxL2pYTGwyZmViM3Z4dXdidDI0bTNSeTRKYnIxK0hiMjdSZDNDdTVNM0YxNmozaXYvTDdhL2VvSCtnL3FmN1Qrc1dYQWJlRDRZTUJnejhOWkQrOE9DWWVlL3BULzA0Zmgwa2ZNUjlValJpT05qNTBmSHhzTkdyM3laTTZUNGFleXB4UFB5bjVXLzNucmM2dm4zLzNpKzB2UFdQelk4QXY1aTgrL3JubXA4M0x2cTZtdk9zY2p4eCs4em5rOThhYjhyYzdiZmUrNDc3cmZ4NzBmbVNqOFFQNVE4OUg2WThlbjBFLzNQdWQ4L3Z3djk0VHorNEE1SlJFQUFBQUdZa3RIUkFEL0FQOEEvNkM5cDVNQUFBQUpjRWhaY3dBQUN4TUFBQXNUQVFDYW5CZ0FBQUFIZEVsTlJRZmRDd01VRWdhTnFlWGtBQUFnQUVsRVFWUjQydTE5ZVZpVVpmZi9tUTBRbFdGbjJBVmN3SVVkQWRkY0VEUk56U1ZSTXkyVnlyYzBVM3ZUTWxPenNzVTFCZHozRlFRR21JMkJBZlNIU201Wldmb20rcGJpdm1VS2dwemZIOS9PYzgwOGdrdXZPdk1NOTdrdXJuTlpMUE9jKzN3KzkrYys5N252QjRBWk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqeG93Wk0yYk1tREZqWm40VHNSQ1kyaGRmZkNGQ1JGRmRYWjJvb3FJQ0tpb3FSQUFBaUNoQ1JCWWdJU1czU0lRaWtRaGF0R2lCQVFFQjlHK2NPWE1tRzhqR1RnRHo1ODhYVlZSVWlDc3FLaVFBSUQxOStyVDB6Smt6TWdDd0JRQVpBRWdCUUFJQTRyKy9HRmtLenhBQTZ2Nyt1ZzhBdFFCUUF3RFZMVnEwcUFrSUNLZ0ZnRnAvZi8vN2dZR0JkYk5uejBaR0FGWnFjK2ZPRlowNWMwWlNVVkVoUFgzNnRPM1pzMmZ0QWFDcHA2ZW5jMXhjWEV1RlFoSG82ZW5wMzZWTGwwQTNOemVGcmExdE14c2JtMllTaWNSV0xCWTNaVmdTSVBvUm9hYW01aThBcUs2cXFycGRWVlYxKzlLbFN4ZiszLy83ZjZjckt5dlBYcmh3NFhSNWVmbC9LaXNycndIQVgzNStmbmNDQWdLcS9mMzlhLzM5L2UvUG16Y1BHUUVJMk9iTW1TTTZjK2FNOU15Wk03WUdnNkVwQURUdjJMRmpZRXhNVEh4aVltTEgwTkRRU0JzYkcwVk5UUTFVVjFmRHZYdjNvS2FtQnVycTZxQ3VyZzRRa2Z0aUpsd1RpOFVnRW9sQUpCS0JXQ3dHaVVRQ01wa01iR3hzUUNxVnd0MjdkeThjUDM3OGlFNm5PM0Q0OE9HeVE0Y09uUWFBUDd0Mjdmb1hBRlIzN2RxMWRzR0NCY2dJUUNBMlpzd1l5ZG16WisyS2k0dWIyZG5aT1E4Wk1xUmIvLzc5RXp0MjdCaHRaMmZuZStmT0hiaHo1dzdVMU5SQWJXMHQ5M08xdGJWdzd0dzV1SDM3TmxSV1ZvSlVLb1hLeWtwbzBxUUpYTDU4R2R6ZDNlSFNwVXZNQzhTN3VibkIzYnQzd2RQVEUycHJhOEhUMHhPYU5Xc0czdDdlSUpWS1RRaENLcFdDcmEwdDJOblp3WjA3ZC80b0x5OHZWNmxVMnB5Y25KTHE2dXFyWGJwMHVlM241MWUxZGV2Vys0eFNMZEErL1BCRDBhdXZ2aXJ6OS9kM0JJQ0FYcjE2RFZtMWF0WDIzMy8vL2VxWk0yZncrUEhqV0Y1ZWp2djM3OGV5c2pKVXFWVDQ2YWVmNHRTcFU3Rjc5KzdZdTNkdnRMT3p3N0N3TUpSS3BSZ1JFWUZTcVJRakl5TlJKcE5oVkZUVVEzMTBkRFR6WnZDUEdwZkl5RWlUOFF3TEMwTTdPenZzM2JzM2R1L2VIYWRPbllwejVzeEJsVXFGWldWbFdGWldoZ2NQSHNURGh3L2p6ei8vakNkT25MaStaTW1TSGQyNmRSc0NBQUcrdnI2T3ljbkpzdW5UcDdPYWtDWFlCeDk4SUJvMWFwU05uNStmczUyZFhmRDQ4ZU9uLy9EREQ4Zk9uVHVIUC8zMEU1YVhsMk5aV1JrV0ZoYmlpaFVyY09qUW9aaVFrSUJTcVJURHc4TlJLcFZ5eVJRYkc0c3ltUXpqNCtOUkpwTmhwMDZkVUNhVFllZk9uZEhHeHFaQjM2VkxGK2JONkI4MlBzYmpTT05LNHh3ZEhXMlNCd2tKQ1Roa3lCQmNzV0lGRmhZV1lsbFpHZTdmdng4UEh6Nk1KMDZjd0pLU2toOUdqUm8xM2RiV050algxOWQ1eElnUk51Ky8vejRqQW5OWmNuS3l6TmZYMThuZTNqNWt4b3daY3lzcUt2NDRjK1lNSGpseWhKdnAwOUxTTUNrcENXTmlZa3htZEVxQ1RwMDZvWTJORFhidDJoVnRiR3p3aFJkZVFCc2JHK3pSb3dmYTJ0cGl6NTQ5Ni9XOWV2VmkzZ0o5UStQVm8wY1BrL0dsOFNaeW9IeUlpb3BDcVZTS01URXgyS2RQSDB4TlRlV1VRWGw1T1I0L2Zod1BIVHIweDZSSmsrWTJhZElreE1mSHgybllzR0V5aHNibmFNT0hENWY0K1BnNEFFRFFPKys4TS9QMDZkTy9uejU5R2c4ZE9vUmxaV1dvMFdod3dvUUoyTFZyVjVSS3Bad2NqSXVMUTVsTVpnSjI0K1JKU0VoQVcxdGJURXhNUkZ0YlcweEtTbUxlaWp5Tks0MHpqVHVmRkNoUGlBeTZkdTJLNDhlUFI0MUdnMlZsWlhqZ3dBRThkdXdZbHBlWC96NSsvUGlaQUJEazdlM3Q4UExMTDBzWU9wK2hUWjA2VlJRZkgyOEhBRjVKU1VuSlI0NGNPWHJtekJrOGZQZ3dscFdWWVhaMk5rNmFOQW50N2UyNW1UNHVMczVrY0dsbTU0TzliOSsrYUd0cml5KysrS0tKNzkrL1ArZnQ3T3lZRjVBM0hqLyt1Tko0ODBtQmxBS2ZEQ0lqSTlIZTNoNG5UWnFFMmRuWlhLM2doeDkrUUkxR2M3Ujc5KzdKQU9EVnNXTkh1MG1USnJGbHdkTzJvVU9IU3J5OXZSMFZDa1hrdW5YcnRwOC9mNzcyMkxGanVILy9mbFNwVkRoa3lCQ01pSWhBbVV5R0hUdDJSSmxNeHEwUithQ25HYUZmdjM0bTRCNHdZQURhMmRuaFN5KzlaT0lIRGh6SXZJQTlmenhwbklrY0tBOG9ML2hrMEtWTEY1Tzhpb2lJd0NGRGhuQ0Z3L0x5Y3Z6aGh4OXF2Lzc2NisxdWJtNlJYbDVlam9NR0RaSXkxRDRGbXpKbGltam8wS0cyQU9EVnYzLy9jV2ZPbkRsLzh1UkpQSGp3SUJvTUJwdzVjeVkyYmRxVW0vRnBUVS95bmdiVGVJYXZEK3dOSmMrZ1FZT1l0d0wvS0hLZ2ZPQXJCTW9mV2laUXpTQXlNaEtiTm0yS00yZk9SSVBCd0JVTHk4ckt6aWNrSkl3REFLK0JBd2ZhdnZYV1cwd04vQS9nRjN0N2V6ZTFzN05ydldMRml0WG56cDJyUFhMa0NPN2J0dytYTFZ1R3ZYcjFRcGxNaGpFeE1TYXlqZFoyeE9pUEF2M2pKdEhnd1lPWkY1Qi9VbkpvaUF3b2ozcjE2bVdTWnpFeE1TaVR5YkJYcjE2NGRPbFMzTGR2SCs3ZnZ4K1BIRGxTTzIvZXZEVzJ0cmF0UFQwOW03NzExbHRpaHVaL0JuN0hvS0NnenZ2MjdUdncyMisvNFlFREIxQ3YxK09JRVNNd0xDeU0yOXA1Mkl4UDhyNmhtWjdOa013L1RCblFNcUVoUlVCYmkyRmhZVGhpeEFqVTYvVllWbGFHaHc0ZHdsMjdkaDMwOC9QcjdPbnA2ZmptbTI4eUVuaUM5YjRVQUZ6ajQrT0hWbFJVVlA3MDAwOVlWbGFHMjdkdng0Q0FBRzZ0VC91OXROWERabnptbjZjaTZObXpwMG0vUVVSRUJMWm8wUUszYmR1RysvYnR3NE1IRDJKSlNVbGxlSGo0VUFCd2ZlbWxsMWhkNERIQUx3TUF4V3V2dlRicGp6Lyt1SDMwNkZIY3QyOGZmdjMxMXlpWHl6RXFLb3FUWWJhMnR0aTdkKy9IbXZFWnlKbi9KK1R3S0VWQStVZkxncWlvS0pUTDVmajExMTl6UzRJREJ3N2NIang0OEw4QVFERmd3QURXTS9BSThIdE5telp0NXJsejUrNGRPblFJOSszYmgrKysrNjdKV3I5NzkrNG1jcXhmdjM0bVRNMUF6L3l6SkFQS005bzlvRHpzM3IyN1NXM2czWGZmNVVpZ3ZMejgzcmh4NDJZQ2dCY2pnWWVBLytPUFA1NzcrKysvM3o5NDhDQVdGQlRnMkxGanVTMFlZL0QzNmRQSEJQeHNyYy84ODY0TkdKTUE1U09SQUcwWmpoMDdGZ3NLQ21oSmNQL05OOStjKy9lT0ZpTUJzaUZEaGtnQndQUEREei84aE1DdjFXcHgrUERoWEp1bWNhR1BtamY0YTMyMmxjZjg4OXhDNU5jR0tDK3BRRWp0eGNPSEQwZXRWa3RxNFA3NDhlTS9BUURQL3YzN3M1ckEwS0ZESlFEZy9zNDc3MHovL2ZmZmF3ajhnd2NQTnVua28yWWVLc0N3R1o5NVM5d3RvUHlrSmlMcUpCdzhlTEF4Q2RRa0p5ZFBCd0QzL3YzN045NzI0Y21USjR1OXZiMmRrNUtTeHZ6KysrOVZCdzhlUkoxT2gwT0hEaldaK2ZuZ3A1bWZkZXd4YjBrZGh2eGRBaUlCVWdKRGh3NUZuVTZIKy9idHc5TFMwcW91WGJxOHBsQW9uQ2RPbk5qNHRnamZmZmRka2JlM3QwT0hEaDM2bmoxNzl2cWhRNGV3c0xBUWs1T1Q2d1YvUTdLZmdaOTVTeUNCaHBZRGZCSklUazdHd3NKQzNMZHZIK3IxK3VzdFc3YnNxMUFvSENaTW1OQzRPZ1pqWTJPYnVMbTVoUjg3ZHV6azBhTkhzYlMwRkZOU1V0ak16N3pWSzRHVWxCUXNMUzNGdlh2MzR1N2R1MCs2dUxpRVIwWkdObWxNUlQ4WkFQaG5aR1NvZnY3NVp5d3RMY1c1YytlYVZQc2Z0ZVpuNEdmZWtrbWdvWm9BN1E3TW5Uc1hTMHRMY2QrK2ZmalZWMStwQU1DL1Vld01USjQ4V1F3QWJ0T25UNTk5K3ZScDNMdDNMNjVhdFFwdGJXMjVmZjVIVmZzYk9yWEhQUFBtOVB6OGJHaDNJQ1ltQm0xdGJYSFZxbFZZV2xxS3BhV2xPSHIwNkU4QXdHM0NoQW5XWFEvdzl2WnVGaG9hMnZmTW1UTzNEeHc0Z0VxbEVsMWNYREE2T3ByYjU3ZXhzWG5rbXA5NTVvVkFCc1lrWUp6ZjBkSFI2T0xpZ2prNU9WaGFXb282bmU3MjMvV0FadGJlN0JOb01CZ09IajE2RkV0S1NqQW1Kb1k3eXR1dFd6ZTBzYkhobWlyWXpNKzhOU21CUG4zNm9JMk5EWGJyMW8wN1Vod2RIWTBsSlNWWVVsS0M2ZW5wQndFZzBDbzdCZitXL3E3VHAwLy85TlNwVTFoYVdvcFRwMDdsVHZYUjVSMzg5bDcrWlIzTU15OGt6KzhZVEVoSU1MbGtKQ3dzREtkT25Zb2xKU1ZvTUJodzlPalJjd0hBMWVxMkJ1UGo0NXY0K2ZuRi9mYmJiOWYzNzkrUG1abVozRzI4ZElrSEhheGc0R2ZlbWttZ2QrL2VKcGVMUkVkSFkyWm1KcGFVbEdCdWJ1NTFEdytQdU9qb2FPdlpGWGovL2ZmRkFPQ1ZucDYrL2ZqeDQxaGNYSXl2dlBLS1NhY2ZYZUxSdDI5ZlRqWXhFbURlV3NCUCtVeW5DT2x5RWVvVWZPV1ZWN0M0dUJnTkJnUCsrOS8vM2c0QVhsWnprVWluVHAyYVJrZEh2M2o2OU9sN2UvZnV4UlVyVm5CWEwvTzMvSXlEeFNjQjVwa1hvdWZuTTM5cmtLNnMvKzY3NzdDNHVCalZhdlc5NE9EZ0YyTmlZb1QvVHNycDA2ZExBTUJuKy9idCtVZU9ITUhpNG1KczJiSWxSa1pHbXB6dVMweE01R1FTQXovejFrb0NsTisweTBXN0FwR1JrZGl5WlV0T0JjeWJOeThmQUh3bVRab2s3TE1DblR0M2Job2ZILy9TYjcvOVZsdGFXb3FmZnZvcGhvYUcxbHY0YTBqK004KzhOWkdBOGZWaXhnWEIwTkJRL1BUVFQwa0YxTFpyMSs0bFFhdUFHVE5taUFIQWEvMzY5Vm1IRHg5R2c4R0FQWHYyTkxuTHovZ0N6L29VQVBQTVc1T24vT1pmTkVwM0MvYnMyUk1OQmdNV0ZoYmlyRm16c2dEQWE5S2tTV0toenY1MnJWcTE2bmJxMUttN3BhV2x1SGp4WXBSS3BmVzIrekx3TTk5WVNjQzRUVmdxbGVMaXhZdlJZRENnVXFtODYrUGoweTBtSnNaT2NPQ2ZObTJhQ0FCYzU4eVpzK0xZc1dOb01CZ3dORFFVSXlJaVRPNzA2OU9uRHllTGpJUERQUFBXN0NuZnFlbU43aFNNaUlqQTBOQlFOQmdNV0ZCUWdPUEdqVnNCQUs2Q2U5dlF5SkVqWlJLSnBQVVBQL3p3eDk2OWUzSDkrdlhZdm4xN2s5dDg2WlhjZkFYQVBQT053VlBlVTE4QTNTN2N2bjE3WEw5K1BSWVZGZUhtelp2L0VJdkZyUWNQSGl5czdrQmZYOTltUTRZTW1YRGl4QWtzS2lwNjRLaXY4VlhlVEFFdzMxZ1ZBUCtLY2VNancwVkZSYWhTcWJCcjE2NFR2THk4aEhORzRJTVBQaEFCZ0dMVnFsVlo1ZVhscU5WcVVTNlhjejMvdFBWQjhvZUNRTlZSNXBsdkRKN3luczRJZE8vZW5Uc2o0T0RnZ0ZxdEZnc0tDbkQ2OU9sWkFLRDQxNy8rSll4bHdLaFJvMlMydHJadGYvcnBwMnNsSlNVNGI5NDg3TkNod3dQeW40R2ZlVVlDU1NidHdiUU02TkNoQTg2Yk53OExDd3R4MjdadDEyUXlXVnZCTEFPNmR1M2FkT0RBZ2VOKy9QRkhMQ3dzeERGanhxQlVLbTN3bWkraGs4QS9mVjg5QTBIamppTjkvdnF1RDVOS3BUaG16QmdzTEN6RTNOeGM3TlNwMDdpT0hUczJGWXI4ZDF1d1lNSDY4dkp5MU9sMEp2Sy9XN2R1Smk5VDRKT0FVRHg5YnZLMG5DRlB6MGVlLy8vNVB5KzA1MmR4ZkxyUFQ4OW5mRlJZTHBlalRxZERyVmFMNDhlUFh3OEFidSs4ODQ1bEx3Tm16Wm9sQVlDQUF3Y09uQ3d0TGNWdnYvMldxLzdUcVQ5cS9oSGFvRFdVckxTY29lZWlBaWZmMC8rbjcyK3NaTURpV0g4OHFDbUlUZ20yYjk4ZXYvMzJXOVRyOVppZW5uNFNBQUxlZmZkZHkyNE43dGF0bTQyM3QzZnNUei85VkZOWVdJaVRKMDgyT2ZqRGY0c3ZmOUFzMWZObkpFcENXczVRWVpQMmM2bk5tVHo5ZHpyN1FEOUh2NGMvd3drbExpeU9UOGZ6M3pwTUI0UW1UNTZNZXIwZWQrM2FWZVBpNGhJYkd4dHJZK2tFMEd6WXNHRnZIVHQyRFBWNlBZYUhoNXRjK21ITTNFSlBWcnJCaUFxYmRMU1pPaDM1bnY0L2ZUOHRoNnlkREZnY0g4OFRMb3d2Q3drUEQwZTlYbzg1T1RuWXRXdlh0enAyN0dqeDI0RXU3Ny8vL3NxREJ3K2lYcS9ud005L3c0K2xEd3BmbHBMOHBCbUtsalAwSXNqSXlFaHMwcVFKSmlRa1lIeDhQTDcyMm1zNGFOQWdIRHQyTEhicTFBa1RFaExRM3Q2ZWU3VTVLU0w2UFRTajBkOTVsTHdWR3ZpZk5JNTkrdlRCK1BoNEhEVnFGQTRhTkFoSGpScUZjWEZ4bUpDUWdIWjJkbHhOeVZyaVNKK1AvMGFoME5CUTFHcTFxRmFyY2VqUW9Tc0J3TVZpa1Q5ejVrd1JBSGhsWldVWlNrcEtjUFBtelNpVlNybkI0ci9TbTEvUXNSVFBuNmxJbHRHTVExYzdSMFJFWUhSME5INzQ0WWU0ZE9sU1ZLdlZXRkJRME9DWFJxUEI1Y3VYNDh5Wk16RTJOcGFMQzgxczlQdHBtZFRRVENZVS95Ung3Tml4NDJQSFVhVlM0YUpGaTNENjlPa1lFUkhCa2FyUTQyajhxbkVpUTZsVWlwczNiMGFOUm9QejVzMHpBSURYNU1tVExiTVErUEhISDBzQUlHai8vdjFuaTRxS2NQYnMyVndCTUQ0KzNvU1poWkswTkZQUjZjV29xQ2gwZDNmSGp6NzZDSGZ2M3MxVmFmUHk4bkRQbmoyNGRldFdYTDkrUGE1ZXZSclQwOU54N2RxMXVISGpSdHk1Y3lkbVoyZWpTcVZDblU2SEJRVUZtSm1aaWJObnowWi9mMy91ZmdUNk8veVpUR2drUUorWFArUFQ4MFZHUm1KQVFBRE9uajBiTXpJeTZvM2poZzBiY00yYU5iaHExU3BjdDI0ZEY4ZWNuQnhVcTlWY0hIZnUzSWtmZnZnaHVybTVZVlJVVkwxeEZBb0pVTHpvZEdENzl1MXg5dXpacU5QcE1DMHQ3U3dBQkUyWk1rVmlxZXQvbVZnc2JudnMyTEVxdlY2UE0yYk1RS2xVYW5MbHR6SFQ4YmQ0ek8zcGM5RXloUXBPTkZQRng4Zmo5T25UVWFQUm9GYXJSYVZTaVJzM2JzU2xTNWRXZi9qaGgwZGZldW1sOVowN2QvNDRQRHo4OWJadDJ3NXQwYUpGWWtoSXlOQ3dzTEJ4blRwMStuakFnQUZyUC9yb284T3BxYWxWTzNmdXhQejhmTlRwZEtqVDZYRG16SmxjRXdqTlpLU1k2UE5ZYXR5ZU5JNmRPM2ZHRHovOGtBTjlUazRPeGJHSzR0aXBVNmVQd3NQRDMralFvY1BJRmkxYUpJYUdobzZLaUlnWTM2bFRwNDlmZnZubFRYUG56djFwMWFwVjkzYnYzczJScWxxdHh2ZmVlNDlycDZXK0U0b2pmMWxncVhFenZqcGNLcFhpakJrenNLQ2dBRGR2M2x3bEZvdmJ4c1hGeVN5VkFHd2pJeU43SHpseUJIVTZIUTRZTUlDNy9LTno1ODcxTXJHbEppMVZuV2x0T243OGVNekl5RUN0Vm90Nzl1ekIxTlJVbkRadFdubW5UcDArZG5CdzZBZ0Eva1ZGUmIzeElWWlVWTlFiQVB5Yk4yOGUzYmx6NTVtelpzM2F2M256NXJyYzNGelU2WFNZbFpXRmI3Lzl0c25hbGdxbkRSVzRMTTN6QzN6OE9MNzk5dHU0Wjg4ZTFHcTFtSm1aaVN0V3JMZy9kZXJVL2ZIeDhSODFiOTQ4NW5IaU9IWHExTllBME1MSnlhbFQxNjVkNTN6NjZhZEh0bXpaZ25sNWVhalQ2WEQzN3QwNGR1eFlremdLaFV3cGZqUVpoSWFHNG9BQkExQ24wK0dPSFR1d1pjdVd2ZVBpNG13dGxRQ2FEaGd3WU56MzMzK1BPcDBPQncwYVpMSUZ5SmRqTkFqbTlzWkphN3lHakk2T1JpY25KMXk0Y0NFMzQ2ZW5wK003Nzd5ek56ZzRlQ1FBQk5UVzFsYmdQN0RhMnRvS0FHZ1JIQnc4Yk5xMGFVWGJ0MjlIbFVxRldxMFdseXhaZ2k0dUxweWNwUUlYcmFINU01bWxlRHJRUXArVFBuZFVWQlE2T3p2amtpVkx1RGltcGFYaFcyKzlaUWdLQ2hvS0FDMythUnlycXFvTUFCQVlHaHI2NnNjZmYzeGc1ODZkM1BKZ3dZSUZLSmZMT1FWSzQ4b25VMHZMUTFJQXRCVTRhTkFnanRoaVkyUEh4Y2JHV21aSFlOZXVYWnNuSnlkUHA5ZDh0MnJWaXRzRm9PQmJXdkkyQlA2b3FDaDBjM1BEVFpzMm9VYWp3UjA3ZHVCbm4zMTJNU29xYWpJQUJPQlROQUR3ajQ2T2Z2Tzc3NzQ3cDFRcVVhdlY0dWJObTlIVDA1TXJGRm82Q2RRSGZpcGtLUlFLcnBDMWZmdDJuRGR2M3Ztd3NMQzNBYURGVTQ1allQZnUzYWVscDZkZnljM05SYTFXaXhzMmJEQWhVMHNuQVlvaktZQ3dzREJzMWFvVjZuUTYzTE5uRDNidjNuMTZ4NDRkbTFza0FmajUrVG1PSFR0MmZsbFpHZXAwT295TGk3Tm9CZEJRZFRvcUtnb1ZDZ1Z1MjdZTjFXbzFidGl3QVNkTm1sVHE0dUxTK2ZidDIrdnhHVmhWVlpYQjJkbTU0d2NmZkZDUWxaV0ZXcTBXZCszYWhYNStmbHlWMjdpd1pVd0M1b3FuY2NlZThlZWlBbFpFUkFUNit2cmlybDI3VUsxVzQ3cDE2ekFsSlVYdjVPUVVXMVZWWlhnV2NieHk1Y3FuN3U3dTNlYk9uYnMvT3p1YkkxUGpBbUZEdXdTV3FnRGk0dUpRcDlOaFRrNE9KaVFrelBmeThuSzAxSjFBcC9Ianh5OHFMUzNsamdEekZRQ2ZlYzNsQ1R6MWdkL0Z4UVUzYmRxRUtwVUtWNjllamNuSnlic2tFa2xyZkE0bUZvdGJUcHc0Y1dObVppYXExV3JjdVhNbit2bjVZWGg0ZUwwa1lPNTRrbkxpZ3o4OFBCeDlmWDF4eDQ0ZG1KK2ZqNnRXcmNMaHc0ZHZFb2xFTFo5SEhHVXlXZkRreVpPejl1elpneHFOQmpkdTNGaXZFaUFTNEpPcHVlTnByQURrY2psWExFMU1URndFQUU2V1NnRE9FeWRPWEZsU1VvSmFyUmJidDI5dmNnY2dYd0ZZU3JDcFVCVWRIWTFObWpUQjlQUjBWS2xVdUhidFdodytmUGltcHkzNUgwUEsrcjMyMm12TExKMEVIaGY4NmVucE9IRGd3T1VBNFArYzR4ajR6anZ2N016T3prYU5Sb09wcWFuWXBFa1RyaVpBNDI0cGt4SmZBZEFkZ2UzYnQrZHFKMGxKU1NzQXdObGlDU0FsSldXMXdXQkFyVmFMVXFtMFFRWFEwRUdQNStYNTRLY3E5ZXpaczFHajBlQ1dMVnR3M0xoeHVRQVFpR1l3QVBDdGp3VDRuWlhVUnN1ZnlaNjFKK1ZFZjU4NjE4TEN3aG9DdjY4NTRpaVZTbHZObWpWTGs1dWJpeHFOQnFkUG4vN0E3b0FsNXFXeEFwQktwYWpWYWpFM054Zjc5ZXUzMnBJSndDVWxKV1YxVVZFUmFqUWFEQTRPTmxFQTFMTnRDVUUyN2tHbi9lbkV4RVJVcTlXWWtaR0JIMzc0NFMvMjl2YWhhRVlqRXNqSXlFQ1ZTb1U3ZHV4QVgxOWZzNVBBbzhDL2ZmdDJ6TXZMdzdTME5IenBwWmZNQm42eTVzMmJoNldtcHY2YW41K1BhclVhRXhNVFRmb3QrR2NKekoyZnhua3BsVW94T0RnWU5Sb05LcFZLN051MzcycExiZ2MySVFCakJXQmN4VFlPdHJrOEJabWFSa0pEUTNISmtpV1lsNWVIUzVjdXJmTHg4Um1JRm1DUElnSGpacGY2VHNrOWJjOC9yVWZ4czFUd2s3VnUzWHBRVmxaV2xWcXR4a1dMRm5FM1ZGSDgrQ1JnTHMvZlJTRUZJRWdDSUFWQWNzdFNnc3h2U3cwUEQrZG0veTFidHVETEw3KzhCZ0E4MFVMTVVraEFxT0QvTzRhZTc3enp6cnI4L0h6VWFEVFl1M2R2N29wNmZ0dXdwVXhPdEFzZ0tBVXdjZUxFMVlXRmhhaFdxemtGWUJ4a2N5dUErcXIrTXBrTU4yN2NpTG01dWZqbGwxOWVzYmUzajBBTE16NEpiTisrSFgxOWZibE9TNUt6Vk5ONDJzbE00S2ZmVDh1bTBOQlFFL0NucHFaYUhQakpuSnljb3ZmczJYTmRyVlpqZW5vNnltU3lCbmNGekoyZmhCZFNBR3ExR25OeWNvUkZBRzNhdERFNUMwRHRtQlJrYzNtYXdhandOMkRBQUZTcFZMaDE2MVo4OGNVWGx6K3FGZFdjSkRCbXpKaGx1M2Z2eHZ6OC9NY21nZjgxWG84Qy83WnQyekEzTnhkVFUxTnh3SUFCRmdsK2FpR2VOR2xTbWtxbFFyVmFqVWxKU2ZXMkMxdEtmdEpaZ0RadDJnaVRBS1JTS1lhR2h0WXJzOHdWWEg3aHFrT0hEamg1OG1UTXo4L0haY3VXVlRrNU9YVkdDN2JuVFFMV0FuNHlYMS9mN21xMXVrYWxVdUhiYjcvTnhjMjRvR3JPL09RdlQwTkRRNjFIQVZBU2tjeDUzdDc0RWdycVZKTktwYmhqeHc3TXlzckM5OTU3cjlqU0UvaGhKRUNGTFQ0SkdPOFNQSW1ubitPRHYwT0hEb0lFUC9WWXJGcTFhcjlhcmNhdFc3ZWEzRmRoZkttSU9mUFV1QzlGa0FwQXI5ZWpTcVZDaVVUQ01TeS9lY1hjd1NYNTM3MTdkMVNwVkxobHl4YnMwcVhMcC8vMFVJcTVTR0RYcmwyWWw1ZUgyN1p0ZTZvazhEamdWeXFWdUhMbFNzR0FIeEd4dXJyYU1HellzTTgwR2cycVZDcnUraTErdk13OVNWRlRWV2hvS0Vva0VsU3BWSmlkblkxSlNVbkNJWURXclZ1alZDcDlvTkJDRC9tOFBhMnRqT1YvVWxJUzV1Zm40NW8xYXpBd01MQWZDc2dlUlFLMHRxVzRHKzhTUEU2YzZPZUlMQnNBL3pLaGdKOHNKaVptSUwxMnEzZnYzbHk4K0gwVjVzcFQ0d0sxVkNyRjFxMWJDNU1BSkJLSnhRYVhybHVhT1hNbTV1WGw0YkpseTI0Q1FEQUt6SjQyQ1ZnNytQOCtiOUcyc0xEd2prcWw0aTZ0b1J1WnpEMUoxVmVqRXFRQ3lNL1A1eFFBQlpmV1dQU1F6OXZ6NVd5N2R1MXcvdno1cUZRcThiUFBQanZ4dkh2K255WUp2UHJxcXh3SmJOMjZGWDE5ZmJucjJLZ0dRL0huTHd2NDhhSHZpNDZPNXE2bDh2WDF4YTFidHdvZS9IUkdJRGMzOXplMVdvMmZmUElKdG12WDdxSExwdWZ0S2Y0MFNiVnUzUnJ6OC9NeEt5dExHQVJRVUZDQStmbjVKZ3FBMzZ4aXJ1QWFIMWlSU3FXNGF0VXF6TTdPeGxtelp1MERBQjhVcUJFSjdOeTVFM056Y3grYkJQajM3ejhNL0RrNU9iaGl4UXJzMzcrL1lNRlBzZHErZmZ0K2pVYURhV2xwS0pWS0h6aG9aYTc4NURkWmtRSVFKQUcwYXRVS3BWTHBBeDFYOUpEUDJ4dmY5Q09UeVRBa0pBVFhybDJMMmRuWk9HM2FOQjBBZUtHQXJTRVNvQm1PZjJFbXhZTzg4Y1ducEpDc0RmeC94OGw3NDhhTmVxMVdpNnRYcjhhUWtCQVRrdVF2bDU2M3AzR2dYYXBXclZvSlZ3SFFETVNYVitZS3J2SEJGYWxVaWhzMmJNRHM3R3o4OTcvL3JSYzZBVHdKQ1ZCTmhtWjgrcmUxZzU4SVlOdTJiUWFkVG9mcjFxMHpPYk5DY1RCWGZ2S1hxZTNidHhlV0FwZ3dZY0pxblU2SGVYbDVEU29BL3V1ZW5wYzN2cU9PRk1DeVpjc3dPenNiNTh5WlUyWU55VzFNQWp0MjdFQ2xVb2xidG13eElRR3F5ZEN5akR6dGh4UDR0MnpaZ3RuWjJmamRkOS9oaXkrK3VNeWE0ck5uejU2REdvMEdGeTllL0lBQzRDK1RucmV2VHdIUWRlbUNJZ0NKUk1JbEhiOGFiYTdnR2g5Z2tVcWwrTTAzMzZCU3FjU3Z2LzVhc0VYQUp5R0J0bTNiY2sxUXBBaU0vOTIyYlZ1ckJqOFZBUXNMQzA5cU5CcGN1SENoaVFJZ01qUlhmdkozWDlxMWE0Y1NpVVNZQk5DeVpVdXV3RkxmTzkyZXQrZXZjVU5DUXZEdHQ5L0czTnhjWEwxNjlRMGhiZ00rS1FuNCtQaHdNeDQxYVpFUENRbEJIeDhmcXdiLzMzRnBlK2pRb2RzcWxRb25UcHo0Z0FKb3FFYnl2RHpoaEFyVkxWdTJGQjRCNU9ibW9rUWk0V1ljS3J5UnZESlhjUGtLWVBUbzBkeGF1V1hMbG4zUnlveFBBcHMzYjBZZkh4OXVpellrSklUYmF2THg4Y0hObXpkYk5mZ1JFVHQzN2p6dzBLRkRtSnViaThuSnlmVXFBSFBsSjdXcEUxN2F0bTJMRW9rRWMzTnpNVE16RXhNVEV5MmZBT2o2SW1NRllCeGNJb0huN1drTDBEaTR2cjYrbUp1Yml4a1pHZGk3ZCs4NVFta0ZmbElTR0QxNjlMTHQyN2RqVGs0T2J0cTBDWDE4ZkRBd01CQ2xVaWtHQmdhaWo0OFBidHEwQ2JPeXNuRDU4dVZXQy83cTZtckQ2NisvUHIrc3JBeHpjM05Sb1ZCd3kxVEtDMUlBNXNwVG1xU01GWUFnQ2NCWUFaRHN0clRndG1yVkNqZHUzSWc1T1RuNHlTZWZHS3d4NlJzaUFXOXZiL1R4OFVGdmIrOUdBWDZLUTA1T3psNjlYbzlyMTY3bEN0V1dOa2tSWGdTdEFJS0Nna3prRlcwRkVnazhiMDlySzJMNkRoMDZvRlFxeFZtelp0RXlvTXJGeFNVZXJkVDRKTEJ4NDBhTWpvN0dqUnMzTmdyd0l5TDYrdnAyT1g3OGVIVitmcDdhQUNrQUFDQUFTVVJCVkQ1KzhNRUhLSlZLdVdZMXFnRlFucGdyVDJrTGtKYXBRVUZCd2lNQXBWS0pFb21FSzdBUW8xbEtjR21MSlRnNEdFTkRRMUdwVkdKV1ZoWU9IejU4MFcrLy9mWjZZeUVCZXU3R0FQNmlvcUxlczJmUFhuN2d3QUZVS3BYWXJsMDdyZ2JDZjhXNE9TY3BZN3lFaElTZ1JDSkJwVktKR1JrWndpSUFVZ0JVWmFhdFFITUZsenh0c1JERHRtclZDdFBUMDFHcFZPS0dEUnN1Tm0vZVBCeXQySWdFdG0zYmhwbVptYmhzMlRLckJ6OGlvck96YzhUeDQ4ZXYwRHNDU1A2VFFyVzAvS1RMUUlLQ2dvUkpBTVlLZ0pwTWFJMUZTdUI1ZTJKNFlsaDZlY21vVWFOUXFWUmlkblkyamg4L1BoVUFQQm9CQ1N4WnRHZ1I5dS9mZjRtMWd4OEFGRjk4OFVWYWVYazVLcFZLSERGaUJQZlNEZU1PU2NvUGMrVW4xYWdJTDRKV0FGUmxibWlOWlM1UERFdkxnTFp0MjZKVUtzWGx5NWVqVXFuRTNidDMzd2tJQ09pUFZtNEE0QkVWRmRYUDJza09FVEVzTEd6QXI3Lytla2VsVXVIeTVjdE54cDNrUHlrQWMrY252MFlWR0Jnb1hBVVFIQnhzMG1sR0RNdHZRMzFlbnY0K0JabGtWdXZXcmJGTm16YW9WQ294TnpjWDA5TFNmbXJhdEdsN1pDWjRrOHZsSFE0ZVBQaExTVWtKS3BWS2JOT21EZGNIUWZLZkppZEx5RTlqdkFRSEJ3dExBWXdmUDM2MVJxUEJuSndjVGdId1paYTVna3VlbUo1a0ZqRnR5NVl0TVNVbEJYTnljakEzTnhjLyt1aWpIR3RxRDI2TUJnQUJtelp0eXY3KysrOVJxVlJpU2tvSzE1OUN5cFRPUmxCZW1Ecy8rY3ZUd01CQXpNbkp3ZDI3ZDJPZlBuMkVRd0FTaVlTN0dKVDJXVWwrRTlPWnk1TUNvR1VBOVZ5M2J0MGF2L3JxSzh6SnljSDgvSHg4NzczMzFzSnpmcWtsczZjR2Z2L2x5NWV2TzM3OE9PYmw1ZUhDaFF1eFZhdFczQmtWWS9sUCtXRHV2Q1I4VUo5S216WnRVQ0tSQ0pNQUFnSUNIbEFBbGhCazh2UjVLTmpVZE5HaFF3ZGN1WElsS3BWS1ZLbFVPR1hLbEZRQThHT1FFaFQ0L1JZdlhwejY4ODgvWTM1K1BxNWN1Wks3WElQVy9qUXBXV3Bla2dJSUNBZ1FyZ0tvYjYxbHpIVG04dlE1YUJsQXRRQmFjMFZHUnVLcVZhdFFxVlNpV3ExbUpDQkE4Sjg0Y1FMejgvTngxYXBWR0JFUndkV2tqUE9SeHQvUzhwSzJxRnUzYmkxY0JkQ2lSUXRPWGhzSDI5eEJKazlNeXljQmtsMFJFUkdNQkt3SS9MUWNwYjRVR25mS0EwdkpTK043R2FSU0tiWm8wVUpZQktCV3F6RTdPL3VoQ3NCU1BQODhQTWt1WXQ2SWlBaE1UMC9Ibkp3Y1ZLbFVPSG55WkVZQ0FwRDllWGw1bUo2ZXpvR2Y4cEFLZi96N0VDd3RML2tLSURzN0czZnQyaVVzQWlBRndMK0V3dEtDVFl4TGEwSStDWVNIaHpNU0VDRDR3OFBEVGNCUHRTZ2FaNzc4dHhSdmZEa0xLUUJCRW9CRUl1SGFMVWwyRWVOYW1xZWdFL09TL0tLcU1TTUJZWUtmOG8vR2s1UW9Yd0ZZbXFmbEtPV2ZWU2dBZnRYVlVqek5CSThpZ2JDd01FWUNBZ0IvV0ZqWVk0R2ZYd093RkU4NHNRb0ZVRi9UaFNWN0NqNHhNQTBDSXdGaGdwL0dqeFFvWC81YnFqZHVUaE9jQWxDcFZKaVZsWVgrL3Y3Y3RWTTBzMXB5MEdsbWFJZ0VhRENJQkxLenN6RS9QNStSZ0lXQm55YWRoc0RQVndDVzVna25kRlRaMzk4ZnM3S3ljT2ZPbmNJaUFPUEJvQUtNcFFlZmtZQ3d3SitibTJ0VjRPZnZSbEcrQ1pJQS9Qejg2bTIrb0llMFZFL0pRcCtYNUJnZHphUkJDUTBOWlNSZ0FlQ25WMmpUdU5ETVNjdE9Ha2MrQ1ZpcXB4b1VOYVg1K2ZrSlZ3SFFwU0RVRENTVVFYZ1VDUVFGQlRFU3NDRHcwM2dJSGZ6ME9hbHdTYzhsYUFYQTc4Q2loN1IwVDhsRG41dGtHVEV6SXdITEFqOHBUVnB1MHJqeFNjRFNQYjhqMVNvVkFDTUJaZ3o4RFh1clVBQyt2cjRtQ29Bdnk0VGlLWm5vODlQZ0VFTUhCZ1p5cHdnWkNUeDc4Tk9wUG9vNzVSZE5NalJPZkJJUWlxZmxKdVdYcjYrdmNCVUFYUXBDelVCQ0d3eEdBZ3o4NXZDMGkwSFBLUmdDZU9PTk4xYm41K2ZqbmoxN09BWEE3OFhtdjVOT0tKNlNpNTZEQm9uT0RBUUVCSEFra0phV2hsbFpXWmlYbDhkSTRDbUFQeTB0alFNL3habnlpaVlYR2hjK0NRak44OCtpK1ByNjRwNDllM0RIamgyWWtKQWdIQUtnd1RKdUJoTHFvRHdwQ2JSdjM5NkVCTjU5OTExR0FrOEkvcDkrK2dtVlNpV21wYVZoKy9idEd3WDRqVi9VU3BlQlNDUVNZUktBajQvUEF6M1p4b01rVkUvSlJzOWovSUpOUmdMUEQvdzBxZEE0OEVsQXFKNS9Cc1hIeDBmNENvQnVCeGI2NERBU1lPQi9IcDUyTmF4S0FaQmNzM1lTSU9adTBhSUZJNEduQUg2S0krV1J0WU9mZndCTjBBcUFqZ1JUdFpZS0hOYmlTYTdSb0JGekc1T0FXQ3htSlBBUHdDOFdpeDhBUDhXWDRrM3h0N2E4SXJ6UTh3dVNBTHk5dlUwT2FOQU0yZGhJd04vZkg4VmlNYlpyMTQ2UndHT0F2MTI3ZGlnV2k5SGYzNzlSZ3A5d1FtY2J2TDI5aGFzQTZFZ3dyZDFvMEt6TlUxTFM0Rkd5MGlENitmbWhXQ3pHa0pBUVJnSVBBWDlJU0FpS3hXS3VqWndtRDRvbnhaZFBBdGJtQ1M5RWdvSWtBQzh2TDVOMllCckV4a0lDSk9Pb25kUEh4d2ZGWWpHMmFkT21QaEx3YldUZzkrV0R2MDJiTmlnV2k3bmFFZVVOeGJHeGdKOXdRbm5qNWVVbFhBWGc1K2Rud21nMGVOYnVhUkRwdWFtYTYrbnBpV0t4R0lPQ2dqZ1N5TXJLd29rVEp5NXBUQVR3elRmZkxQbnh4eDg1OEFjRkJhRllMRVpQVDArVDNTT0tIMS8rVzd1bjV5WWxaRlVLb0xHUkFIOFo0T2JtaHA2ZW5yaG16UnJjdlhzM0xsbXlCQWNOR3ZSVll5S0FOOTk4ODZ1dFc3ZGlSa1lHcmxtekJqMDlQZEhOemUyaDhyK3g1WTFWS0FCZlgxK3VJR1lzNDZ6ZEd4Y0NqYXU1Q29VQ3ZieThPUEF2WHJ3WSsvWHJ0eFFBZkJyWkVzQm41TWlSU3pkdjNzeVJnSmVYRnlvVUNwUGRJMzRCc0xIa0R6MDN0ZE1Ma2dCSXp0R0JJUDVhcnJHQW53NTBlSGw1b1plWEY2NWR1NVlEZjkrK2ZaYzF0dlcvY1IwZ09UbDVHWkhBMnJWcnVSZ1o1MDFqSXdIQ0NlV05wNmVuOEJVQVg4NVpxNmZCbzZTbHRiK1BqdzhEL3hPUUFCVUNxUlpBOGFUNFduc2VFVjZzUWdFMFZOQmg0Ry9jNEdja1VMK3ZyM0FzV0FYZzQrUERGVFNzZWZBWStCa0pQTTA4SXJ6UTh3dVNBSXdMT3NZZFhmU1ExdUtKc2Fuemo4RHY3ZTNOd1A4VVNJQTZTaW11bEVjVWQydkxKLzVaRW9WQ0lVd0NlRmhUQndNL00wWUNEWHQrODVnZ0NjRER3NE5yQnpiZTE2VkJFN3FuSktSOWZnYis1MHNDbEU5OE1oQzZwM3dpM0hoNGVBaFhBZENnMFpZT0F6OHpSZ0tQOXJRRjZPM3RMWHdGUUoxZHRBeWd3UktxcDZRam1VWnJOYmJQLzN6N0JDanVsRmQ4TWhDcXA3d2kzQWhLQVJqZkNteXNBUGhWWEdzRi83cDE2ekFqSXdPWExGbUMvZnIxWStCL0NpUXdjdVRJWlZ1MmJNSE16RXhjdDI1ZG95QUJZMFVwRm91RmVTMjR1N3U3VlNrQVNpNlNaN1JHWStBM0x3blFPTkF5VStna3dGY0E3dTd1d2lRQXNWaHN3dFRHZ3lNMFQrVEZCNytucHljRHZ4bEpnSnJOK0NUQVZ3UkM4OGJLMG1vVUFKK2hHZmlaTVJKNDBGT2VXWVVDTUI0YzQwRVJpcWRrb2pVWkRRcWQ2bVBndHd3U29LWXpHaCtxT2ZISlFDamVlSklSckFKd2MzUGpEZ1FaRHdvRFB6TkdBZzE3eWpmQ2padWJHMU1BRFB6TUdoTUpXSTBDTUc0SEpqQlJsZE5TUGEzQnFCRERCLy9hdFdzWitDMlFCS2hQZ0U4Q05JNDBycGFlZjhZSHllZ0dLVUVSZ0ZxdHh1enM3QWNVZ0JBRzRWSGdYN2R1SFdabVp1TFNwVXNaK0MyRUJFYU5HclZzNjlhdHVHZlBuZ2FWZ0ZCSW9MNUNzMWdzeHV6c2JOeTFhNWV3Q01EVjFkV2tHWWcvQ0pibWlYa3ArTFFHWStBWE5nblFPTks0MGpoYmFoNFNUcWdKeU5YVlZaZ0VZS3dBak5ka0RQek1HQWs4UEE4SkwxYWxBUGpCdHhSUGpNdkFiNTBrUUdkUytDUkE0MjVwK1VpZnp5b1VBSitCTFMzb2ZQQlR3ZExEdzRPQjN3cEpnTWJYVWttQVBvL3hKTVFVZ0JsbWZrOVBUd1orS3lJQlQwL1BCcGNEbGtZQ2dsY0FHbzBHYzNKeVVDd1dQNUo1emUxcHJVV2ZUNkZRb0xPek02NVpzd2IzN05tRHk1WXRZK0FYTUFsczI3WU5zN0t5Y00yYU5lanM3TXlSQUkwM2Y1ZkEzTDQrSlNvV2l6RW5Kd2QzNzk0dExBSndjWEV4T1JCazZjRldLQlJvWjJlSFM1WXN3VDE3OXVDS0ZTdndwWmRlU2dmMkdtK2hrb0RmMkxGajAzYnMySUhaMmRtNFpNa1N0TE96ZTRBRUxIVlNvb05BTGk0dXdpUUFTMVlBZk5sUDFkWXBVNlpnZG5ZMnJsNjlHcE9Ua3pNQklJQkJTZEFrRVBEdXUrOW03TjY5RzdPenMzSEtsQ2ttdTFNTkxRZVlBbmlLQ3FDaFlKdkxFOFB5d1I4VEU0UFoyZG00ZGV0V2ZPKzk5NDdiMk5pMFpSQVN2dG5aMmJWZHRHalI4VDE3OW1CT1RnN0d4TVNZS0ZQS0E4b0xjK2NuUHk4RnJRRG9TREFWQWkwdHlKUUU3dTd1dUdUSkVzek16TVN2dnZycWprS2g2TmNJWmtkRmNuTHlZQUJRV1B1enRtalJvdC8yN2R2dlpHZG40N2ZmZnNzZFZPT1RnS1ZNVG9RWGQzZDNZU21BQ1JNbXJOWnF0YWhVS2h0VUFQU1E1dkwwT1l5RDNMZHZYOHpKeWNHMWE5ZGkvLzc5VndLQWg3V3ZqNWN1WGJyeTExOS94ZmZmZjMrbHRkYzVBTUJqNHNTSnFWbFpXWmlUazRNSkNRa1BURTZXbHAvR0NrQ3BWR0pHUmdZbUppWStWUUtRUGtzMnVINzlPcmk0dU1ERml4ZEJvVkRBK2ZQbndjdkxDODZkT3dmZTN0NW04VjVlWG5EKy9IbFFLQlJRV1ZrSnJxNnVjT1hLRlJnMmJCalUxdGJDSDMvOGNWR24wNjFBeEF0Z3BTWVNpZndYTDE0OE15RWhJYVdpb2dJU0VoTGV2SC8vdmtna0V2a2o0bGxyZkdaRXZPRGc0QkRSbzBlUGw1czJiZXIyeWl1dmdGNnZCemMzTjZpc3JBUlBUMCtMeWs4UER3KzRjT0VDdUxpNHdOV3JWNTlaWE1UUE11aE9UazV3OWVwVmNIZDNod3NYTG5CQk5sZHd2YjI5NGZ6NTgrRHA2UW1WbFpYZzd1NE9WNjVjZ2M2ZE80T3JxeXZjdW5VTGlvdUxOLy84ODg4eDFnNyt4TVRFbERObnprQk5UUTNVMXRaQ1VsSlN5cFFwVTJhS1JDSi9hMzMybkp3Y1Y2MVd1eDBBd01QREErTGk0dUR5NWN2Zzd1NXVRZ0tXa0o4WExsd0FkM2QzdUhyMUtqZzVPUW1UQUVnQlhMcDBpWnR4aVdITjVRbjhDb1VDTGwyNkJNN096aEFSRVFHSUNOZXVYYnQ3Nk5DaDNZR0JnV3NhQS9qUG5Uc0hjK2JNZ1FzWExqUUtFbmpoaFJkMGVYbDUyd0hnSGlKQ2VIZzRPRHM3bStTbnA2ZW5XZlBUeTh2TEpEOWRYRnpnK3ZYcndpTUFrVWpFS1FBM056Y1RCVUF5eHh5K3NyS1NrMWV1cnE1dzdkbzFpSTJOaFpxYUd2alBmLzZ6LzhhTkczOVlLL2lYTEZreU15a3BLZVhzMmJOdy92eDVtRDkvUGh3K2ZCam16NThQRnk5ZWhQdjM3MFBmdm4xVDNudnZQYXNsZ1V1WEx2MyszLy8rOTRCWUxJYlkyRmk0ZHUwYXVMcTZ3b1VMRjhERHc0T2JwTXlacDZRQTNOemNPQVVnRW9sQUpCSUpVd0Zjdm56WklvTjc1Y29WYU51Mkxjamxjcmh6NXc0Y1BYcTB1TGEydHRSYXdXODg4My8yMldkdzl1eFpjSEJ3Z0xObno4Sm5uMzFtb2dTc2xRU3FxNnMzR1F5R0VvbEVBaTR1THRDNmRXdTRjdVdLUlU1U2x5OWZGcTRDTUs0QnVMbTVtUlFDS2NqbThNYkJkWFoyQm05dmIwQkVxS3FxZ25QbnpoMlFTQ1F0ckIzOEN4WXNnSXFLQ25CeWNvSmJ0MjZCazVNVFZGUlV3SUlGQzZ5ZUJHeHNiTHFmUG4zNm9Fd21Bd0FBYjI5dmNIWjJoc3VYTDVzc0E4eVpwd3FGQWk1ZXZHaWlBQVJiQTZEZ0doY0NLY2ptOEI0ZUhuRHg0a1ZPL29lRWhBQWl3cDA3ZDI2ZVBYdjJUR01BLytuVHA4SFoyUmx1M0xnQkxpNHVjT1BHRFhCMmRvYlRwMDgzQ2hJNGZQandmeER4THdDQWtKQ1FlcGNCNXN4VEtnRFNKQ1U0QlVCckZVZEhSeTY0L0VLTE9id3hzMTY1Y2dXY25KekExZFVWRUJIKy9QUFA4d0JRYlkzZ1AzdjJMSnc3ZHc0Ky8veHpxS2lvNEpLS1NORFYxWlVqNjRxS0N2ajg4ODg1RXJEU21rRFZuVHQzem92RlluQnhjUUVuSnlkdUdVQksxZHg1ZXVuU0pXNThIQjBkbjFrZ3BNOHdBYm1aNWNxVkt4YWxBSXozVjUyY25HZ0pjQk1BYXF3Wi9EVHpFK2dwNlM5ZnZzejltNVRBNTU5L0RqTm56Z1NGUWdGOSsvWk4rYnNJWlMxOUFqWFYxZFUzYkcxdE9mS2pXcFZDb2JDSVBIVjNkK2QycWE1ZHU4WVZBWjkySWZDWk5nTEo1Zko2RllDNXZMSDhKd1ZnYTJ0THhhRy9BS0RPR3NGUHN0L0p5Y2tFL0NRektkbU00MExMQVNLQnBLU2tGUHI5VmtBQ2RmZnUzYnNqRW9sQUpwTnh0U3BYVjFlNGVQRWl0d3d3WjU3U0x0V1ZLMWRBTHBjTFR3RUFBTnk4ZWJOZWVYWGh3Z1d6ZVhkM2Q3aDQ4U0xIckJLSmhJQ0QxZzUra3YzVW5HVU1mdnAzWXlFQmlVUWlFb2xFSUJhTHVlWFBsU3RYdUVuQzNIbEt5b3pHVFRBMUFHT3BJcGZMdWFTanJVQnpCdFhEdzhOa2JlWGs1QVIzN3R3QnNWZ005dmIyOXMrNktQbzh3SitVbEpUeTMvLytGODZmUC8vRTRLZk9NNUxGeGlSZzNDY3dkZXBVb2RjRUpIK1BOOXk1YzhkRUdWMjZkTWtpOHBUSStQcjE2eUNYeTU5Wkg4QnpWd0FVWEhONEtnQWFyNjF1M2JvRllyRVk1SEs1Q3dESWhBNSttdmsvKyt5emVzRlB6MjhNZm1QUHJ3a1FDWHoyMldjd2E5WXNyaVlnY0NVZ2xjdmx6dFhWMVhEcjFpMFRCVUFLMFJMeVZKQUtnRjhETUM2d0dBZlhITjVZNXBJQ09IdjJMSWhFSW5CMGRQUUNBRHRyQVAvOCtmTk53RThGVDBxcWhzQlA4YUg5WjJwQ0lSS1lQMysreWU2QVVKV0FXQ3h1MHJ4NWMwOUVoUC8rOTc4bUNzQ1M4cFRpTC9nYUFNbEtrbGZtREM3TmdBU0s4K2ZQZzBna2dpWk5talFQRGc0T3NnYndVNU1QZ2YvYXRXc1BnUDloeVdlc0JJeDNTeW9xS21EKy9QbncwVWNmQ1ZvSmRPdldMVmdrRWpXcHE2dURjK2ZPY1hFaUJXQUplV3Fzd0FUWkIyQmNBekFPcnFVb0FFcnE3Ny8vSGtRaUVkamIyNE9mbjEvSGUvZnVGUXQxemYrL2dwOXFKTVpLNE5xMWF5WktnRWlBYWdMOSt2VkxlZi85OXdXakJHN2Z2cjBoT0RpNDQ3MTc5MEFrRWtGNWVibkpKRVcxS25QbjZaVXJWMHdVd0xPcUFUeHRjNWs0Y2VKcXZWNlBLcFVLUlNJUmR5a0kzV3hDbHh5WXk5TWRhM1JsdVpPVEUyN2F0QW56OC9OeHdZSUYrMEFBRjJNQWdOK1NKVXRTZi8zMVY5VHBkTGgrL1hvTUNnb3lpVGU5bUpXZWwrNlhmOXc0MGZmVHo5UHZjM0Z4UVpGSWhFRkJRYmgrL1hwVXE5VllVRkNBNzcvL2ZxcEFZdWV2MFdnT0ZCVVY0Wm8xYTlESnlja2tIK2g1eloybmhCZUt0MHFsd3V6c2JFeEtTckxzRzRHTUNjRFIwZEVrdUUrYWhNOGp1SFFScUVxbHdoMDdkdHhUS0JUZEdqdjRyWmtFV3JaczJlUG5uMyt1MFdnMCtLOS8vY3NrRHl4bGtxSzRFMjRjSFIyRlJRQ0ZoWVVXcXdBb3VNYkpIQklTZ2lxVkNuTnpjM0hzMkxFcnAwNmQydHFTd1gveTVNbG5EbjVySkFFQThQajg4ODlYSHp4NEVGVXFGYlp1M2ZxQnVGbmlKQ1U0QlZCWVdJaHF0ZHBpRlVCOXk0Qmx5NWFoV3EzR2JkdTJYWFYwZEl5eVpQQVhGQlRnaGcwYm5qbjRuNFFFTm16WWdCcU5CdlY2dmNXU2dKZVhWK3lKRXlldUZ4UVU0TGZmZm11eDhyOCtCYUJXcXpFbkp3Zjc5dTBySEFJUWlVVG83T3hjTDhPYTJ4c25zVmdzeHY3OSs2TmFyVWFWU29XVEprMWFCd0NlUWdBL3haZVNoV1lPUGduOHI1NStILzErK252T3pzNkNJQUVBOEZxMmJObVdRNGNPb1ZxdHhuNzkrcG1NdjZYbUo4VlhrQVFnbDh0Tmd2eTBrL0ovVFdaS1lwckpGaTFhUklHdWF0T216Y3NNL05aREF2SHg4Y05PblRwMVQ2ZlQ0VmRmZmZWWXlzbmMrVW1mVHk2WEM0Y0FVbEpTVmhjVkZhRkdvN0ZvQmNCUFlpY25Kd3dLQ2tLVlNvVmFyUlkzYmRyMEg3bGNIbTRKNEQ5MTZoVHE5WHF6Z3Y5SlNVQ3IxV0poWVNGT216Yk43Q1RnNGVFUjljTVBQMVRzMjdjUDgvUHpzVVdMRmcvSWYzb2VTMVVBOUs0TlN5Y0E1NGtUSjNJRVlLa0tvQ0VTY0hSMHhOR2pSNk5HbzBHZFRvZWZmLzY1Uml3V3Q3UWs4Rk5TbUFQOGowTUNZckhZb2toQUpwTzF6c25KS1R4eTVBaHFOQnBNVGs2MmVQRHpGWUNUa3hOcU5Cb3FBcVlCZ0xQRkVzRDQ4ZU5YRWdIWTJOZzBXR2l4Rk0rdkJUZzVPZUhYWDMvTnlkaVBQLzU0QndBRVBtZnd0MWk2ZEdtYU1mZ0RBd081ejFmZjJ0V1M0aWNXaXpFd01OQ0VCS1pQbjU0R0FDMmVaeHdsRWtuTFRaczJaZno0NDQ5RTZGeGgybExpMTVBM1ZxWjJkblljQVNRbUpuNW55UVRnTkc3Y3VFVUdnd0cxV2kzSGFQeXRRRXNKTW44R284L3A3ZTJONmVucHFOVnFzYWlvQ0QvLy9QTXNHeHViNE9lVXRLM1dyRm16N2VUSmsxaFlXSWdiTjI1OEpQak5GVmY2dXc4amdZMGJONkpPcDBPRHdZQno1c3paSmhhTFd6MlBPTnJiMjRmczJyVXI3OFNKRTFoUVVJRHA2ZWttYjl0OW1JS3lsTHlrejZsUUtGQ3IxV0pXVmhZbUpDUXNBZ0FuaTBTL3I2K3Y0NnV2dmpxL3VMZ1l0Vm90dXJtNVBaQzBscW9BK0RMVzE5Y1hWNjllalZxdEZnMEdBMjdZc0dHL241OWZ0NnRYcjM3NkxCTDJyNy8rV3QraVJZdE9HbzJtK01TSkU2alg2M0hqeG8yYzdMYzA4RDh1Q1FRRkJabVF3T3JWcTB1OHZiMDczNzU5ZS8yemlPTnZ2LzMyZXBzMmJYcVVscForLytPUFAzTGc5L0h4cVhmNVpLa0t3RGlPYm01dXFOVnFNU01qQTN2MjdEbmYwOVBUMFNJSm9FdVhMczJIRFJzMnZhU2tCTFZhTFhibzBNRWs2SmJHdEk4aUFSOGZIMHhOVGVXVVFGRlIwZVVSSTBaTWU5cExBZ0FJR0QxNjlMdi8rYzkvTGh3K2ZCaDFPaDJtcDZlam41K2ZSWVAvY1VuQXo4K1BVMVFHZ3dFTEN3c3ZEaG8wYURJODVWZXZBMERRdi83MXI1bG56cHk1OXYzMzM2Tk9wOE1WSzFhZ3Q3ZTNvTUJQOGFUUEd4b2FpbHF0Rm5mdTNJbGR1blNaSGhNVDA5eFNDYUJwMzc1OXgrM2R1eGUxV2kxR1IwYy9zT1lTR2dsNGVIamd0R25UVUt2Vm9sNnZ4LzM3OStPdVhic09KQ1FrakFHQXdPcnFhc00vU2RiYTJ0b0tBQWpvMjdmdnlNTEN3dExmZnZzTjkrN2RpenFkRGovNTVCT3VLY1RTd2YrNEpPRHA2WWt6Wjg3azRuamd3QUhjdm4zN3ZwNDllNDRHZ0lCL0dzZS8vdnByUFFBRURoa3k1STM5Ky9jZk9uWHFGTklFTkhueVpPN3pDUTM4RkQ5SFIwZU1qbzVHclZhTDI3WnR3K2pvNkhFZE8zWnNhcWtFWUJzYUd0cTdyS3dNZFRvZERoa3lwTjZ0UUVzTCtxTklRQzZYWTgrZVBYSDM3dDJjbEQxMDZCQnF0ZHBqNDhhTm0rdnQ3ZDBKQUZwTW5UcTFkVzF0YlVWRHlUcDE2dFRXQU5EQ3k4c3I5czAzMy96azRNR0QzNTg1Y3dZUEhqeUlCUVVGbUptWmlRTUdET0IyVCtqdld6cjRIMFVDeG5GTVRFekVqSXdNMU9sMFdGeGNqSDgzNWh3ZU4yN2NuTWVKNDkvRTZRRUFnUUVCQVYyblRKbXk0Tml4WXorZVBuMGE5Ky9mandVRkJUUlRQaEJIU3djL1B3OXBDM0RJa0NHbzFXcHg0OGFOR0JBUTBMdGp4NDYyVCsxVTZkTWtnTTZkTzhzT0hEalEybUF3SExwNzk2N3RqaDA3WVBmdTNkekxKK2htR3VQYmFDM04wL2wzdWpISTBkRVJidHk0QVE0T0RsQlRVd052dnZrbTlPclZDMlF5R1VpbFVtamF0Q25ZMjl2WDNMeDU4MVJwYWVteGlvcUtVOWV1WFR0WFUxTno1OGFORzM4Nk9UazFsOGxrZHM3T3pwNHRXN1pzblpDUUVPN282Tmo2OXUzYk5qZHUzSUM3ZCs5Q1RVME5HQXdHU0UxTkJaRklCTGR1M2VMK0xuME8rbHlXSGovNmZBK0xZMTFkSGFTa3BFRFBuajFCS3BXQ1RDWURlM3Q3a3ppZU9YUG10MnZYcnAyN2QrL2VYNGg0WHl3V1MrenM3SnE1dUxqNEJBY0h0K3pSbzBkNHMyYk5BbS9kdWlXOWVmTW1WRlZWd2QyN2R5RS9QeDgyYk5nQU5qWTJENDJqcGNlUDhPTGc0QUJEaHc2RjRjT0h3NWt6WjZwVFVsSWlPM2JzZU9yQWdRTlA1UVpyNlZNbWdMcDkrL1pWM2I1OSs2SlVLdlh6OWZXRm16ZHZncU9qbzhtOUFKWWEvSVpJZ0FaRExwZkRva1dMWU1lT0hkQ3JWeS9vMTY4Zk9Eczd3NjFidDJRU2lhUnRseTVkMnZidTNSdHNiVzFCS3BXQ1dDd0dSQVJFaEpxYUdxaXFxb0tiTjIvQ2xTdFhvSzZ1RG03Y3VBRWFqUWEwV2kzODhjY2Y0T0RnWUVLV1FnUC9vMGpBT0k3ZmZQTU43Tml4QXhJU0VpQXhNWkhlVXNURnNWZXZYdlhHOGQ2OWUxQlZWUVZYcmx5QnlzcEtRRVM0ZlBreTVPZm5RMUZSRVZSV1ZvSmNMdWN1bzZrdmprTEpQN2xjRGpkdTNBQmZYMStvcTZ1RFAvLzg4eUlpVnNmRXhOUWRPSERBOG00RXFxMnRyUU9BcWt1WExsWDQrUGo0K2ZqNGdJT0R3d00zQTFseThCK0hCTTZmUHc5WldWbXdjZU5HaUltSmdUWnQya0JrWkNTMGF0VUs3T3dhdmxXc3Vyb2FUcDA2QlljUEg0YVRKMC9Dd1lNSG9Ybno1dkRubjM4K01tbUZBdjRuSVlFLy92Z0RkdS9lRFd2WHJuMmlPTjY1Y3dkKytlVVhPSExrQ0p3OGVSSU9IejRNY3JrY2J0MjZKWGp3MTZjQWZIeDhvSzZ1RGk1ZnZsd0JBRlYxZFhVV2ZYMjl5MXR2dmJXeXNMQVF0Vm90MnRuWk5kaDVaYWxyc0lacUF2dzFMVDJYbzZNamlrUWlsTXZsNk9ucGlaMDdkOGE0dURnY01HQUF4c1hGWVpjdVhkREh4d2Vkbkp5NDd6UCtlZjVhbjc5V0ZVcThIbFVUZUpJNGVuaDRZS2RPblRBdUxnNTc5KzZOY1hGeEdCOGZqMjV1YmlpWHkxRWtFbkVGNXNlTm8xRGlWVjhUVUZaV0ZnNFlNQ0RWa3R1QWFSblFySC8vL204WEZ4ZGpRVUVCeHNiR21neU9VQWFEVHdKUGtzUVA4NCtickVLTEU0dmoweThBaXNWaWpJMk54WUtDQXR5MmJSdDI3Tmp4N2VqbzZHWVdUUUR4OGZFMkNvVWl0cVNrcExhZ29BQ1RrNU1mT0JNZ3RCbU5QNU05S29rZjVlbjcrZFY5b2MvNDVvcGpRNkFYYXA0Wm53Sk1UazVHblU2SHExZXZyblYyZG82TmlvcXlzV2dDbURKbGlnUUFBckt6czAvcTlYcGN2SGd4aWtRaWpyR0ZPclBSNER3cWlmbkp6RS9TUnlXcnRZS2Z4ZkhKRkFBdEZ4Y3ZYb3hxdFJvLy8venprd0FRTUhIaVJJbEZFOENrU1pORUFPQTJmZnIwRFZRSDRET2IwTmUwajByaXgvVU4vVDVyQlQrTDQ1TXBBSGQzZDlScXRaaWRuWTNEaHcvZkFBQnU0OGVQdC95cmdXTmpZNXYxNmRQbkRZUEJnSHE5SG52MTZ2WEE5V0JDVC9hR2t1NmZlbXNIUFl2amt4VUFIUjBkc1ZldlhsaFFVSUNiTjIvR2lJaUkxeU1qSTV1QkVLeGp4NDR5ZTN2N2RscXQ5cnBlcjhjRkN4YlV1d3l3bHVSbm9HZHhmSnExRVpML0N4WXNRSjFPaDB1WExyMXVZMlBUTmlJaVFoaXZybnZycmJkRUFPQzVZTUdDTExvZWpIL0t5ZHFxM013ei96VHZWZkR3OEVDMVdvMUtwUkxmZU9PTkxBRHdmUDMxMTBVZ0ZQUHk4bXFlbUpnNHNhaW9DUFY2UGZidjM5L3FsZ0hNTS8rczVILy8vdjFScjlmajVzMmJNU29xYXFKQ29XZ09RcktCQXdmS3hHSng2OXpjM01yQ3drSk1TMHN6V1FZd0VtQ2UrZnFiZjBRaUVhYWxwYUZXcThXdnYvNjZVaVFTdFU1S1NoTFdtNnNuVEpnZ0FnRFhkOTU1SjdXd3NCQ0xpb293SmlhR0xRT1laLzRSOGo4bUpnWUxDd3N4SXlNREJ3OGVuQW9Bcm1QR2pCR0IwQ3c2T3RyT3o4K3Z1MWFyclNvc0xNUjU4K1lKdmltSWVlYWZkZlBQdkhuenNLQ2dBRmV1WEZubDd1N2VQU3dzVEhDdnJRY0FnSWtUSjRvQndHdisvUGxaZXIwZWk0cUswTi9mbjlVQ21HZStnYlcvdjc4L0ZoVVZZWFoyTmhYL3ZNYU1HU01Hb1ZwVVZGVFRzTEN3Z1FVRkJiVkZSVVU0Zi83OHg3clhubm5tR3hQNGE2dXlRZ0FBQ210SlJFRlU2ZktQK2ZQbm8xNnZ4OVdyVjljR0JnWU9EQXNMYXdwQ3RuNzkra2tBd0dmaHdvV3F3c0pDTkJnTTNGMkJRcm5waG5ubW44Zk5TUjA2ZEVDRHdZQTVPVG40NXB0dnFnREFKeUVoUVFKQ3Q4akl5S1p0MjdidHI5Rm83aFVWRmVHWFgzNzVRQzJBRlFTWmI4eUZQN2xjamw5KytTWHE5WHBNUzB1NzUrL3YzejgwTkxRcFdJTzkvdnJyWWdEd21qVnIxazY5WG84R2d3SGo0K01GYzJFbzg4dy82NHMvNCtQajBXQXdZR1ptSm80Wk0yWW5BSGlOR2pWS0ROWmlFUkVSVFR3OFBPS1ZTdVYxZWxCN2UzdldGOEI4bzkvM3Q3ZTN4OHpNVE5UcGRMaDQ4ZUxyenM3TzhlM2J0MjhDMW1Sang0NFZBNERycUZHajVoWVVGS0RCWU1BWk0yYXdnaUR6amI3d04yUEdEQ3dxS3NJdFc3WmdRa0xDWEFCd0hURmloQmlzemY3dVpncE1UVTB0THl3c3hPTGlZdXpTcFFzckNETGZhQXQvWGJwMFFZUEJnRXFsRW1mTW1GRU9BSUU5ZS9hVWdiV2FoNGRIczZDZ29MNUtwZksyd1dEQWpJd003czB0akFTWWIwemc5L2IyeG95TURDd29LTURseTVmZjl2YjI3dXZtNXRZTXJObitYZ3E0alJneFlnNjlIR0x4NHNXQ2V3a0c4OHovcnk5TFdieDRNUm9NQnR5MGFSTW1KQ1RNQVFDM1YxNTVSUXpXYm9tSmlUSUE4Sjg3ZDY2cW9LQUFpNHVMY2NLRUNRMXVEVElTWU42YXdDK1h5M0hDaEFsWVhGeU1HUmtabUpLU29nSUEveDQ5ZXNpZ3NWaFlXRmdUSnllbjhQWHIxNThxTEN6RWtwSVNIREJnZ0dEZWhjYzg4Ly8wWFlrREJnekE0dUppek12THcwOC8vZlNVZzRORGVMdDI3WnBBWTdJeFk4YUlQRHc4SEFJQ0F2cGxaR1JjLy91dHNkaTVjMmRHQXN4YkxmZzdkKzZNZXIwZU5Sb05MbHEwNkxxWGwxYy9OemMzaCtIRGg0dWdzZGxycjcwbTl2RHdjSTZOalIyYm01dGJWVnhjakRxZERxT2pveGtKTUc5MTRLZTMvT3IxZWt4TlRhMXEzNzc5T0RjM04rZEdzZTUvU0QxQUFnRHVMNzMwMHZUYzNOeWE0dUppMUdnMEdCRVJ3VWlBZWFzQmYwUkVCR28wR3U2Z3p3c3Z2REFEQU54NzlPZ2hnY1p1aVltSlVnRHdIRDU4K0NkNWVYbjNpNHVMVWF2VllseGNIQ01CNWdVUC9yaTRPTlJxdFZoWVdJaHIxcXk1MzZkUG4wOEF3TE5Iang1U1lQWi8xcWRQSHhrQWVJMFlNV0t1VXFtOFQ2OFc2OTI3OXdObkJ2Z2RnNHdNbUxlRVc0ejVMek54ZEhURTNyMTdZMEZCQWVyMWVseXpaczM5cEtTa3VRRGcxYWdxL2s5S0FvTUhENTZabloxOXI3aTRHRXRMUzNINDhPR01CSmdYSFBpSER4K09wYVdsV0ZCUWdPbnA2ZmQ2OWVvMWs0SC84VWhBMGFOSGowbTdkKysrYlRBWXNMUzBGR2ZObW9VS2hjTGszWERXOGhaZDVxM2pyY2VVbHdxRkFtZk5tb1dscGFXbzBXaHcrZkxsdDJOalkvLzFkMTR6OEQ4R0NVZ0J3TFZObXpiRE5tN2NlRkd2MTJOcGFTbXVXN2NPUTBKQzZuMUJaR043eHg3emx2Rk9RLzRMVFVOQ1FuRGR1blZZVWxLQ09UazV1SERod29zQkFRSERBTUNWcmZtZndGNTk5Vld4dTd1N280ZUhSNWV2dnZxcVhLMVdZMGxKQ2VwME9od3pab3pKRmVNTnZTV1drUUR6ejNMR055NzBpVVFpSERObURPcDBPalFZRExoanh3Nzg0SU1QeWwxZFhidTR1Yms1TnVxdHZ2K1JCSnJLWkxMV0V5ZE9YTHRuejU1YVdoSjg5OTEzNk92ciswQnRnQ2tDNXAvSGpHKzgxdmYxOWNYdnZ2c09TMHRMVWF2VjR1clZxMnRIakJpeFZpcVZ0blp6YzJ2S3dQOC8yT2pSbzBWOSt2U3hCUUN2Nk9qbzE5ZXNXWE5lbzlGZ2FXa3BGaFVWNFJ0dnZNRU56cVBlRzgvSWdQbC9BbnIrakU5NTV1Ym1obSs4OFFZV0ZSVmhjWEV4Wm1abTRzS0ZDOCtIaG9hKy9uZXh6N1pSZHZnOXE3cUF1N3U3bzZPalkrUmJiNzIxUFRNejgzNVJVUkh1M2JzWGMzSnljT1RJa1NpVlNoOVlGand1R1RCU1lDOGlmUmpvamVXK1ZDckZrU05IWWs1T0R1N2R1eGMxR2cydVdiUG0vdWpSbzdjN09EaEV1cm01T2ZiczJaT3Q5NSsyalJvMVNoUWFHbW9IQUY2aG9hSEozM3p6elE5S3BSS0xpNHM1SW5qNTVaZE5ybHQ2SERKNEZDa3diNTJlUC80UEF6MzkvNWRmZnBrRHZsNnZ4eTFidHVEczJiT1BoNFNFakFRQTcvYnQyOXU5OHNvcmJOWi9scGFRa0NEeDhQQndBSUNnUG4zNnpFcE5UZjBqTHkrUEk0Szh2RHg4KysyMzBkWFZsYXNSOEpjSGZESm9pQlNZdDA3UEgzZCtYbEMrT0RvNm9xdXJLNzc5OXR1WWw1ZUhlL2Z1eGNMQ1F0eStmVHQrK2VXWGY3end3Z3V6QUNESTNkM2RvV2ZQbnF5dDkzbjNESGg0ZURqWjJkbTE3ZCsvLy95VksxZWV5OG5KUVlQQmdIdjM3c1Y5Ky9iaE45OThnd01IRGtSN2UzdU9ESWpSR3lLRmhzaUJlV0g3aHNhWjhvRHl3dEhSRWUzdDdYSGd3SUg0elRmZjRMNTkrN0MwdEJSMU9oMXUzYm9WRnk1Y2VLNVBuejd6YlcxdDIzcDRlRGoxN3QyYjdlMmJzMGlZbEpSa0F3RE9NcGtzdUZ1M2JoOHNYTGp3aDEyN2RxRk9wOFBTMGxKT3JuM3h4UmM0Yk5nd2RITno0eTRmb1VGL1hGSmdYdGllRDNieWNya2MzZHpjY05pd1lmakZGMStnWHEvSHZYdjNjdWYyMTY5ZmozUG16RG5lcVZPbkQyUXlXVEFBT1BmcDA4ZG01TWlSZ3BiN0ltc2lnaXRYcmtpUEhqM2E5TUtGQzA0aElTRlJuVHQzSGhZYkc5dkgxZFhWMGNIQkFXeHNiRUFzL3I4ZG1YUG56c0V2di93Q3YvNzZLMXk5ZWhWT25EZ0J0Mi9maG12WHJvRmNMb2RidDI2Qmc0TUQzTHAxQytSeU9keThlWk41Z1hvYVJ3Y0hCN2g1OHlZNE96dERzMmJOSUNRa0JGeGNYS0JObXpZUUhCd00zdDdlQUFCUVcxc0xkKy9laGF0WHI4TFZxMWR2bEplWGE4dkx5M2Y5OHNzdmh6dzhQSzZIaDRmLzVlcnFXcnRseXhZVU9tNnNzbGlSbEpRa3ZYanhvdTJSSTBlYTJkall1RVpFUkhTUGlvcnEwNzU5KzNoWFYxZjM1czJiZzUyZEhVaWxVaENMeFJ3cDFOYldRbVZsSlZ5NGNBSCsrdXN2dUhIakJsUlhWOFB0MjdmQnhzWUc3dDI3eDd6QWZMTm16Y0RXMWhZY0hSMmhhZE9tb0ZBb3dOUFRFNlRTL3l2UzE5WFZ3ZjM3OStIZXZYdncxMTkvd2MyYk4rSHExYXVYZnZycHA3SWZmdmhCZS9UbzBlSjc5KzVkallpSStOUGQzYjFhbzlIVVdoTldyTHBhT1hic1dOSFJvMGVsRnk5ZXRLdXNyR3dLQUE1dDI3YnQ0T25wR1JjVkZSWHA1K2ZYcm5uejVoNTJkblpnYjI4UHRyYTJJSlZLUVNLUmdGZ3NCcEZJQkNLUmlDTUlac0t5dXJvNlFFVHVpOEJlVTFNRGQrN2NnYnQzNzBKMWRUWGN1blhyNHRtelozODZkdXpZNGNyS3l2MG5UcHc0RGdDM0ZBckZYd3FGb2lvc0xLeDJ3NFlOYUkweGFqVGJGYSsvL3JybzBxVkxrZ3NYTHRpY1AzL2U5dno1ODAwQXdON1IwZEhaMzkrL3BWd3VENVRMNWY3QndjR0J6czdPaWlaTm1qUzNzYkZwYW1OajAxUWlrZGd5T0FuVGFtdHJxKy9kdS9kWGRYWDFYM2Z1M1BuejJyVnJGMDZkT25YNjVzMmJaMi9ldkhuNjdObXovN2x4NDhZMUFMamo1ZVYxMTh2THExcWhVTnh6ZDNlL3YzYnRXclQyK0RUYS9jcUpFeWVLTGx5NElLNnNySlNJUkNMcHVYUG5wT2ZPblpNQmdDMEF5QUJBQ2dDU3Y3OUVqVGxXQWpiOCsrdiszMSsxQUZBREFOWGUzdDQxUGo0K3RYVjFkYldlbnA3M1BUMDk2OUxTMHJDeEJZZ2xOYzlTVWxKRVlyRllKQktKUlB2Mzd4ZUpSQ0pBUkJZcjRSSUFBQURFeGNVaEltSmRYUjAyUnFBelk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekpneFk4YU1HVE5tekN6Wi9qL2V6djBFVnNFMGp3QUFBQUJKUlU1RXJrSmdnZz09JztcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG9vbHRpcDtcbiIsIm1vZHVsZS5leHBvcnRzID0gdG50X3V0aWxzID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuIiwiLy8gcmVxdWlyZSgnZnMnKS5yZWFkZGlyU3luYyhfX2Rpcm5hbWUgKyAnLycpLmZvckVhY2goZnVuY3Rpb24oZmlsZSkge1xuLy8gICAgIGlmIChmaWxlLm1hdGNoKC8uK1xcLmpzL2cpICE9PSBudWxsICYmIGZpbGUgIT09IF9fZmlsZW5hbWUpIHtcbi8vIFx0dmFyIG5hbWUgPSBmaWxlLnJlcGxhY2UoJy5qcycsICcnKTtcbi8vIFx0bW9kdWxlLmV4cG9ydHNbbmFtZV0gPSByZXF1aXJlKCcuLycgKyBmaWxlKTtcbi8vICAgICB9XG4vLyB9KTtcblxuLy8gU2FtZSBhc1xudmFyIHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMuanNcIik7XG51dGlscy5yZWR1Y2UgPSByZXF1aXJlKFwiLi9yZWR1Y2UuanNcIik7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB1dGlscztcbiIsInZhciByZWR1Y2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNtb290aCA9IDU7XG4gICAgdmFyIHZhbHVlID0gJ3ZhbCc7XG4gICAgdmFyIHJlZHVuZGFudCA9IGZ1bmN0aW9uIChhLCBiKSB7XG5cdGlmIChhIDwgYikge1xuXHQgICAgcmV0dXJuICgoYi1hKSA8PSAoYiAqIDAuMikpO1xuXHR9XG5cdHJldHVybiAoKGEtYikgPD0gKGEgKiAwLjIpKTtcbiAgICB9O1xuICAgIHZhciBwZXJmb3JtX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIpIHtyZXR1cm4gYXJyO307XG5cbiAgICB2YXIgcmVkdWNlID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoIWFyci5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBhcnI7XG5cdH1cblx0dmFyIHNtb290aGVkID0gcGVyZm9ybV9zbW9vdGgoYXJyKTtcblx0dmFyIHJlZHVjZWQgID0gcGVyZm9ybV9yZWR1Y2Uoc21vb3RoZWQpO1xuXHRyZXR1cm4gcmVkdWNlZDtcbiAgICB9O1xuXG4gICAgdmFyIG1lZGlhbiA9IGZ1bmN0aW9uICh2LCBhcnIpIHtcblx0YXJyLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBhW3ZhbHVlXSAtIGJbdmFsdWVdO1xuXHR9KTtcblx0aWYgKGFyci5sZW5ndGggJSAyKSB7XG5cdCAgICB2W3ZhbHVlXSA9IGFyclt+fihhcnIubGVuZ3RoIC8gMildW3ZhbHVlXTtcdCAgICBcblx0fSBlbHNlIHtcblx0ICAgIHZhciBuID0gfn4oYXJyLmxlbmd0aCAvIDIpIC0gMTtcblx0ICAgIHZbdmFsdWVdID0gKGFycltuXVt2YWx1ZV0gKyBhcnJbbisxXVt2YWx1ZV0pIC8gMjtcblx0fVxuXG5cdHJldHVybiB2O1xuICAgIH07XG5cbiAgICB2YXIgY2xvbmUgPSBmdW5jdGlvbiAoc291cmNlKSB7XG5cdHZhciB0YXJnZXQgPSB7fTtcblx0Zm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcblx0ICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcblx0XHR0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG5cdCAgICB9XG5cdH1cblx0cmV0dXJuIHRhcmdldDtcbiAgICB9O1xuXG4gICAgdmFyIHBlcmZvcm1fc21vb3RoID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoc21vb3RoID09PSAwKSB7IC8vIG5vIHNtb290aFxuXHQgICAgcmV0dXJuIGFycjtcblx0fVxuXHR2YXIgc21vb3RoX2FyciA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8YXJyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgbG93ID0gKGkgPCBzbW9vdGgpID8gMCA6IChpIC0gc21vb3RoKTtcblx0ICAgIHZhciBoaWdoID0gKGkgPiAoYXJyLmxlbmd0aCAtIHNtb290aCkpID8gYXJyLmxlbmd0aCA6IChpICsgc21vb3RoKTtcblx0ICAgIHNtb290aF9hcnJbaV0gPSBtZWRpYW4oY2xvbmUoYXJyW2ldKSwgYXJyLnNsaWNlKGxvdyxoaWdoKzEpKTtcblx0fVxuXHRyZXR1cm4gc21vb3RoX2FycjtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnJlZHVjZXIgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBwZXJmb3JtX3JlZHVjZTtcblx0fVxuXHRwZXJmb3JtX3JlZHVjZSA9IGNiYWs7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS5yZWR1bmRhbnQgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiByZWR1bmRhbnQ7XG5cdH1cblx0cmVkdW5kYW50ID0gY2Jhaztcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnZhbHVlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB2YWx1ZTtcblx0fVxuXHR2YWx1ZSA9IHZhbDtcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnNtb290aCA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gc21vb3RoO1xuXHR9XG5cdHNtb290aCA9IHZhbDtcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHJlZHVjZTtcbn07XG5cbnZhciBibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVkID0gcmVkdWNlKClcblx0LnZhbHVlKCdzdGFydCcpO1xuXG4gICAgdmFyIHZhbHVlMiA9ICdlbmQnO1xuXG4gICAgdmFyIGpvaW4gPSBmdW5jdGlvbiAob2JqMSwgb2JqMikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ29iamVjdCcgOiB7XG4gICAgICAgICAgICAgICAgJ3N0YXJ0JyA6IG9iajEub2JqZWN0W3JlZC52YWx1ZSgpXSxcbiAgICAgICAgICAgICAgICAnZW5kJyAgIDogb2JqMlt2YWx1ZTJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3ZhbHVlJyAgOiBvYmoyW3ZhbHVlMl1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gdmFyIGpvaW4gPSBmdW5jdGlvbiAob2JqMSwgb2JqMikgeyByZXR1cm4gb2JqMSB9O1xuXG4gICAgcmVkLnJlZHVjZXIoIGZ1bmN0aW9uIChhcnIpIHtcblx0dmFyIHZhbHVlID0gcmVkLnZhbHVlKCk7XG5cdHZhciByZWR1bmRhbnQgPSByZWQucmVkdW5kYW50KCk7XG5cdHZhciByZWR1Y2VkX2FyciA9IFtdO1xuXHR2YXIgY3VyciA9IHtcblx0ICAgICdvYmplY3QnIDogYXJyWzBdLFxuXHQgICAgJ3ZhbHVlJyAgOiBhcnJbMF1bdmFsdWUyXVxuXHR9O1xuXHRmb3IgKHZhciBpPTE7IGk8YXJyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAocmVkdW5kYW50IChhcnJbaV1bdmFsdWVdLCBjdXJyLnZhbHVlKSkge1xuXHRcdGN1cnIgPSBqb2luKGN1cnIsIGFycltpXSk7XG5cdFx0Y29udGludWU7XG5cdCAgICB9XG5cdCAgICByZWR1Y2VkX2Fyci5wdXNoIChjdXJyLm9iamVjdCk7XG5cdCAgICBjdXJyLm9iamVjdCA9IGFycltpXTtcblx0ICAgIGN1cnIudmFsdWUgPSBhcnJbaV0uZW5kO1xuXHR9XG5cdHJlZHVjZWRfYXJyLnB1c2goY3Vyci5vYmplY3QpO1xuXG5cdC8vIHJlZHVjZWRfYXJyLnB1c2goYXJyW2Fyci5sZW5ndGgtMV0pO1xuXHRyZXR1cm4gcmVkdWNlZF9hcnI7XG4gICAgfSk7XG5cbiAgICByZWR1Y2Uuam9pbiA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGpvaW47XG5cdH1cblx0am9pbiA9IGNiYWs7XG5cdHJldHVybiByZWQ7XG4gICAgfTtcblxuICAgIHJlZHVjZS52YWx1ZTIgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdmFsdWUyO1xuXHR9XG5cdHZhbHVlMiA9IGZpZWxkO1xuXHRyZXR1cm4gcmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVkO1xufTtcblxudmFyIGxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlZCA9IHJlZHVjZSgpO1xuXG4gICAgcmVkLnJlZHVjZXIgKCBmdW5jdGlvbiAoYXJyKSB7XG5cdHZhciByZWR1bmRhbnQgPSByZWQucmVkdW5kYW50KCk7XG5cdHZhciB2YWx1ZSA9IHJlZC52YWx1ZSgpO1xuXHR2YXIgcmVkdWNlZF9hcnIgPSBbXTtcblx0dmFyIGN1cnIgPSBhcnJbMF07XG5cdGZvciAodmFyIGk9MTsgaTxhcnIubGVuZ3RoLTE7IGkrKykge1xuXHQgICAgaWYgKHJlZHVuZGFudCAoYXJyW2ldW3ZhbHVlXSwgY3Vyclt2YWx1ZV0pKSB7XG5cdFx0Y29udGludWU7XG5cdCAgICB9XG5cdCAgICByZWR1Y2VkX2Fyci5wdXNoIChjdXJyKTtcblx0ICAgIGN1cnIgPSBhcnJbaV07XG5cdH1cblx0cmVkdWNlZF9hcnIucHVzaChjdXJyKTtcblx0cmVkdWNlZF9hcnIucHVzaChhcnJbYXJyLmxlbmd0aC0xXSk7XG5cdHJldHVybiByZWR1Y2VkX2FycjtcbiAgICB9KTtcblxuICAgIHJldHVybiByZWQ7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmVkdWNlO1xubW9kdWxlLmV4cG9ydHMubGluZSA9IGxpbmU7XG5tb2R1bGUuZXhwb3J0cy5ibG9jayA9IGJsb2NrO1xuXG4iLCJcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGl0ZXJhdG9yIDogZnVuY3Rpb24oaW5pdF92YWwpIHtcblx0dmFyIGkgPSBpbml0X3ZhbCB8fCAwO1xuXHR2YXIgaXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBpKys7XG5cdH07XG5cdHJldHVybiBpdGVyO1xuICAgIH0sXG5cbiAgICBzY3JpcHRfcGF0aCA6IGZ1bmN0aW9uIChzY3JpcHRfbmFtZSkgeyAvLyBzY3JpcHRfbmFtZSBpcyB0aGUgZmlsZW5hbWVcblx0dmFyIHNjcmlwdF9zY2FwZWQgPSBzY3JpcHRfbmFtZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcblx0dmFyIHNjcmlwdF9yZSA9IG5ldyBSZWdFeHAoc2NyaXB0X3NjYXBlZCArICckJyk7XG5cdHZhciBzY3JpcHRfcmVfc3ViID0gbmV3IFJlZ0V4cCgnKC4qKScgKyBzY3JpcHRfc2NhcGVkICsgJyQnKTtcblxuXHQvLyBUT0RPOiBUaGlzIHJlcXVpcmVzIHBoYW50b20uanMgb3IgYSBzaW1pbGFyIGhlYWRsZXNzIHdlYmtpdCB0byB3b3JrIChkb2N1bWVudClcblx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cdHZhciBwYXRoID0gXCJcIjsgIC8vIERlZmF1bHQgdG8gY3VycmVudCBwYXRoXG5cdGlmKHNjcmlwdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIHNjcmlwdHMpIHtcblx0XHRpZihzY3JpcHRzW2ldLnNyYyAmJiBzY3JpcHRzW2ldLnNyYy5tYXRjaChzY3JpcHRfcmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JpcHRzW2ldLnNyYy5yZXBsYWNlKHNjcmlwdF9yZV9zdWIsICckMScpO1xuXHRcdH1cbiAgICAgICAgICAgIH1cblx0fVxuXHRyZXR1cm4gcGF0aDtcbiAgICB9LFxuXG4gICAgZGVmZXJfY2FuY2VsIDogZnVuY3Rpb24gKGNiYWssIHRpbWUpIHtcblx0dmFyIHRpY2s7XG5cblx0dmFyIGRlZmVyX2NhbmNlbCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIGNsZWFyVGltZW91dCh0aWNrKTtcblx0ICAgIHRpY2sgPSBzZXRUaW1lb3V0KGNiYWssIHRpbWUpO1xuXHR9O1xuXG5cdHJldHVybiBkZWZlcl9jYW5jZWw7XG4gICAgfVxufTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG52YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGZvciBnZW5lc1xudmFyIGRhdGFfZ2VuZSA9IGZ1bmN0aW9uICgpIHtcbi8vYm9hcmQudHJhY2suZGF0YS5nZW5lID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIHRyYWNrID0gYm9hcmQudHJhY2suZGF0YSgpO1xuICAgIC8vIC5pbmRleChcIklEXCIpO1xuXG4gICAgdmFyIHVwZGF0ZXIgPSBib2FyZC50cmFjay5kYXRhLnJldHJpZXZlci5lbnNlbWJsKClcbiAgICAgICAgLmVuZHBvaW50KFwicmVnaW9uXCIpXG4gICAgLy8gVE9ETzogSWYgc3VjY2VzcyBpcyBkZWZpbmVkIGhlcmUsIG1lYW5zIHRoYXQgaXQgY2FuJ3QgYmUgdXNlci1kZWZpbmVkXG4gICAgLy8gaXMgdGhhdCBnb29kPyBlbm91Z2g/IEFQST9cbiAgICAvLyBVUERBVEU6IE5vdyBzdWNjZXNzIGlzIGJhY2tlZCB1cCBieSBhbiBhcnJheS4gU3RpbGwgZG9uJ3Qga25vdyBpZiB0aGlzIGlzIHRoZSBiZXN0IG9wdGlvblxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbihnZW5lcykge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuXHRcdGlmIChnZW5lc1tpXS5zdHJhbmQgPT09IC0xKSB7XG5cdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmVzW2ldLmV4dGVybmFsX25hbWU7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgZ2VuZXNbaV0uZGlzcGxheV9sYWJlbCA9IGdlbmVzW2ldLmV4dGVybmFsX25hbWUgKyBcIj5cIjtcblx0XHR9XG5cdCAgICB9XG5cdH0pO1xuXG4gICAgcmV0dXJuIHRyYWNrLnVwZGF0ZSh1cGRhdGVyKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZGF0YV9nZW5lO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcbnZhciBib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG5cbnRudF9mZWF0dXJlX2dlbmUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyAnSW5oZXJpdCcgZnJvbSB0bnQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG5cdC5sYXlvdXQoYm9hcmQudHJhY2subGF5b3V0LmZlYXR1cmUoKSlcblx0LmluZGV4KGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5pZDtcblx0fSk7XG5cbiAgICAvLyB2YXIgdG9vbHRpcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAgICAgdmFyIHRvb2x0aXAgPSBib2FyZC50b29sdGlwLnRhYmxlKCk7XG4gICAgLy8gICAgIHZhciBnZW5lX3Rvb2x0aXAgPSBmdW5jdGlvbihnZW5lKSB7XG4gICAgLy8gICAgICAgICB2YXIgb2JqID0ge307XG4gICAgLy8gICAgICAgICBvYmouaGVhZGVyID0ge1xuICAgIC8vICAgICAgICAgICAgIGxhYmVsIDogXCJIR05DIFN5bWJvbFwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogZ2VuZS5leHRlcm5hbF9uYW1lXG4gICAgLy8gICAgICAgICB9O1xuICAgIC8vICAgICAgICAgb2JqLnJvd3MgPSBbXTtcbiAgICAvLyAgICAgICAgIG9iai5yb3dzLnB1c2goIHtcbiAgICAvLyAgICAgICAgICAgICBsYWJlbCA6IFwiTmFtZVwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogXCI8YSBocmVmPScnPlwiICsgZ2VuZS5JRCAgKyBcIjwvYT5cIlxuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICBvYmoucm93cy5wdXNoKCB7XG4gICAgLy8gICAgICAgICAgICAgbGFiZWwgOiBcIkdlbmUgVHlwZVwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogZ2VuZS5iaW90eXBlXG4gICAgLy8gICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgIG9iai5yb3dzLnB1c2goIHtcbiAgICAvLyAgICAgICAgICAgICBsYWJlbCA6IFwiTG9jYXRpb25cIixcbiAgICAvLyAgICAgICAgICAgICB2YWx1ZSA6IFwiPGEgaHJlZj0nJz5cIiArIGdlbmUuc2VxX3JlZ2lvbl9uYW1lICsgXCI6XCIgKyBnZW5lLnN0YXJ0ICsgXCItXCIgKyBnZW5lLmVuZCAgKyBcIjwvYT5cIlxuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICBvYmoucm93cy5wdXNoKCB7XG4gICAgLy8gICAgICAgICAgICAgbGFiZWwgOiBcIlN0cmFuZFwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogKGdlbmUuc3RyYW5kID09PSAxID8gXCJGb3J3YXJkXCIgOiBcIlJldmVyc2VcIilcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgb2JqLnJvd3MucHVzaCgge1xuICAgIC8vICAgICAgICAgICAgIGxhYmVsIDogXCJEZXNjcmlwdGlvblwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogZ2VuZS5kZXNjcmlwdGlvblxuICAgIC8vICAgICAgICAgfSk7XG5cbiAgICAvLyAgICAgICAgIHRvb2x0aXAuY2FsbCh0aGlzLCBvYmopO1xuICAgIC8vICAgICB9O1xuXG4gICAgLy8gICAgIHJldHVybiBnZW5lX3Rvb2x0aXA7XG4gICAgLy8gfTtcblxuXG4gICAgZmVhdHVyZS5jcmVhdGUoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdDtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKSlcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZC5jb2xvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHJldHVybiBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gZC5jb2xvclxuXHRcdH1cblx0ICAgIH0pO1xuXG5cdG5ld19lbGVtc1xuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbmFtZVwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgMjU7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKSlcblx0ICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuXHRcdCAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsXG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIFwiXCJcblx0XHR9XG5cdCAgICB9KVxuXHQgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJub3JtYWxcIilcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuXHQgICAgfSk7XHQgICAgXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGdlbmVzKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGdlbmVzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLnRyYW5zaXRpb24oKVxuXHQgICAgLmR1cmF0aW9uKDUwMClcblx0ICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodCk7XG5cblx0Z2VuZXNcblx0ICAgIC5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIDI1O1xuXHQgICAgfSlcblx0ICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuXHRcdCAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cdFx0ICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgICAgIH1cblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoZ2VuZXMsIHhTY2FsZSkge1xuXHRnZW5lcy5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG5cblx0Z2VuZXMuc2VsZWN0KFwidGV4dFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG4gICAgfSk7XG5cbiAgICAvLyBhcGlqcyAoZmVhdHVyZSlcbiAgICAvLyBcdC5tZXRob2QgKHtcbiAgICAvLyBcdCAgICB0b29sdGlwIDogdG9vbHRpcFxuICAgIC8vIFx0fSk7XG5cblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X2ZlYXR1cmVfZ2VuZTtcbiIsInZhciB0bnRfcmVzdCA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcbnZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xudmFyIHRudF9ib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG50bnRfYm9hcmQudHJhY2subGF5b3V0LmdlbmUgPSByZXF1aXJlKFwiLi9sYXlvdXQuanNcIik7XG50bnRfYm9hcmQudHJhY2suZmVhdHVyZS5nZW5lID0gcmVxdWlyZShcIi4vZmVhdHVyZS5qc1wiKTtcblxudG50X2JvYXJkX2dlbm9tZSA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiXG5cbiAgICAvLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgZW5zX3JlID0gL15FTlNcXHcrXFxkKyQvO1xuICAgIHZhciBlUmVzdCA9IHRudF9yZXN0KCk7XG4gICAgdmFyIGNocl9sZW5ndGg7XG4gICAgXG4gICAgLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgY29uZiA9IHtcblx0Z2VuZSAgICAgICAgICAgOiB1bmRlZmluZWQsXG5cdHhyZWZfc2VhcmNoICAgIDogZnVuY3Rpb24gKCkge30sXG5cdGVuc2dlbmVfc2VhcmNoIDogZnVuY3Rpb24gKCkge30sXG5cdGNvbnRleHQgICAgICAgIDogMFxuICAgIH07XG5cbiAgICB2YXIgZ2VuZTtcbiAgICB2YXIgbGltaXRzID0ge1xuICAgICAgICBsZWZ0IDogMCxcblx0cmlnaHQgOiB1bmRlZmluZWQsXG5cdHpvb21fb3V0IDogZVJlc3QubGltaXRzLnJlZ2lvbixcblx0em9vbV9pbiAgOiAyMDBcbiAgICB9O1xuXG5cbiAgICAvLyBXZSBcImluaGVyaXRcIiBmcm9tIGJvYXJkXG4gICAgdmFyIGdlbm9tZV9icm93c2VyID0gdG50X2JvYXJkKCk7XG5cbiAgICAvLyBUaGUgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tcbiAgICB2YXIgbG9jYXRpb25fdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuXHQuaGVpZ2h0KDIwKVxuXHQuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG5cdC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG5cdC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmxvY2F0aW9uKCkpO1xuXG4gICAgdmFyIGF4aXNfdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuXHQuaGVpZ2h0KDIwKVxuXHQuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG5cdC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG5cdC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmF4aXMoKSk7XG5cbiAgICBnZW5vbWVfYnJvd3NlclxuXHQuYWRkX3RyYWNrKGxvY2F0aW9uX3RyYWNrKVxuXHQuYWRkX3RyYWNrKGF4aXNfdHJhY2spO1xuXG4gICAgLy8gRGVmYXVsdCBsb2NhdGlvbjpcbiAgICBnZW5vbWVfYnJvd3NlclxuXHQuc3BlY2llcyhcImh1bWFuXCIpXG5cdC5jaHIoNylcblx0LmZyb20oMTM5NDI0OTQwKVxuXHQudG8oMTQxNzg0MTAwKTtcblxuICAgIC8vIFdlIHNhdmUgdGhlIHN0YXJ0IG1ldGhvZCBvZiB0aGUgJ3BhcmVudCcgb2JqZWN0XG4gICAgZ2Vub21lX2Jyb3dzZXIuX3N0YXJ0ID0gZ2Vub21lX2Jyb3dzZXIuc3RhcnQ7XG5cbiAgICAvLyBXZSBoaWphY2sgcGFyZW50J3Mgc3RhcnQgbWV0aG9kXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24gKHdoZXJlKSB7XG5cdGlmICh3aGVyZSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBpZiAod2hlcmUuZ2VuZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Z2V0X2dlbmUod2hlcmUpO1xuXHRcdHJldHVybjtcblx0ICAgIH0gZWxzZSB7XG5cdFx0aWYgKHdoZXJlLnNwZWNpZXMgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLnNwZWNpZXMod2hlcmUuc3BlY2llcyk7XG5cdFx0fVxuXHRcdGlmICh3aGVyZS5jaHIgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS5jaHIgPSBnZW5vbWVfYnJvd3Nlci5jaHIoKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICBnZW5vbWVfYnJvd3Nlci5jaHIod2hlcmUuY2hyKTtcblx0XHR9XG5cdFx0aWYgKHdoZXJlLmZyb20gPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS5mcm9tID0gZ2Vub21lX2Jyb3dzZXIuZnJvbSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLmZyb20od2hlcmUuZnJvbSlcblx0XHR9XG5cdFx0aWYgKHdoZXJlLnRvID09PSB1bmRlZmluZWQpIHtcblx0XHQgICAgd2hlcmUudG8gPSBnZW5vbWVfYnJvd3Nlci50bygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLnRvKHdoZXJlLnRvKTtcblx0XHR9XG5cdCAgICB9XG5cdH0gZWxzZSB7IC8vIFwid2hlcmVcIiBpcyB1bmRlZiBzbyBsb29rIGZvciBnZW5lIG9yIGxvY1xuXHQgICAgaWYgKGdlbm9tZV9icm93c2VyLmdlbmUoKSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Z2V0X2dlbmUoeyBzcGVjaWVzIDogZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpLFxuXHRcdFx0ICAgZ2VuZSAgICA6IGdlbm9tZV9icm93c2VyLmdlbmUoKVxuXHRcdFx0IH0pO1xuXHRcdHJldHVybjtcblx0ICAgIH0gZWxzZSB7XG5cdFx0d2hlcmUgPSB7fTtcblx0XHR3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpLFxuXHRcdHdoZXJlLmNociAgICAgPSBnZW5vbWVfYnJvd3Nlci5jaHIoKSxcblx0XHR3aGVyZS5mcm9tICAgID0gZ2Vub21lX2Jyb3dzZXIuZnJvbSgpLFxuXHRcdHdoZXJlLnRvICAgICAgPSBnZW5vbWVfYnJvd3Nlci50bygpXG5cdCAgICB9XG5cdH1cblxuXHRnZW5vbWVfYnJvd3Nlci5yaWdodCAoZnVuY3Rpb24gKGRvbmUpIHtcblx0ICAgIC8vIEdldCB0aGUgY2hyb21vc29tZSBsZW5ndGggYW5kIHVzZSBpdCBhcyB0aGUgJ3JpZ2h0JyBsaW1pdFxuXG5cdCAgICBnZW5vbWVfYnJvd3Nlci56b29tX2luIChsaW1pdHMuem9vbV9pbik7XG5cdCAgICBnZW5vbWVfYnJvd3Nlci56b29tX291dCAobGltaXRzLnpvb21fb3V0KTtcblxuXHQgICAgZVJlc3QuY2FsbCh7dXJsIDogZVJlc3QudXJsLmNocl9pbmZvICh7c3BlY2llcyA6IHdoZXJlLnNwZWNpZXMsXG5cdFx0XHRcdFx0XHQgICBjaHIgICAgIDogd2hlcmUuY2hyXG5cdFx0XHRcdFx0XHQgIH0pLFxuXHRcdFx0c3VjY2VzcyA6IGZ1bmN0aW9uIChyZXNwKSB7XG5cdFx0XHQgICAgZG9uZShyZXNwLmxlbmd0aCk7XG5cdFx0XHR9XG5cdFx0ICAgICAgIH0pO1xuXHR9KTtcblx0Z2Vub21lX2Jyb3dzZXIuX3N0YXJ0KCk7XG4gICAgfTtcblxuICAgICB2YXIgaG9tb2xvZ3VlcyA9IGZ1bmN0aW9uIChlbnNHZW5lLCBjYWxsYmFjaykgIHtcblx0ZVJlc3QuY2FsbCh7dXJsIDogZVJlc3QudXJsLmhvbW9sb2d1ZXMgKHtpZCA6IGVuc0dlbmV9KSxcblx0XHQgICAgc3VjY2VzcyA6IGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdHZhciBob21vbG9ndWVzID0gcmVzcC5kYXRhWzBdLmhvbW9sb2dpZXM7XG5cdFx0XHRpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0ICAgIHZhciBob21vbG9ndWVzX29iaiA9IHNwbGl0X2hvbW9sb2d1ZXMoaG9tb2xvZ3Vlcylcblx0XHRcdCAgICBjYWxsYmFjayhob21vbG9ndWVzX29iaik7XG5cdFx0XHR9XG5cdFx0ICAgIH1cblx0XHQgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgaXNFbnNlbWJsR2VuZSA9IGZ1bmN0aW9uKHRlcm0pIHtcblx0aWYgKHRlcm0ubWF0Y2goZW5zX3JlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdldF9nZW5lID0gZnVuY3Rpb24gKHdoZXJlKSB7XG5cdGlmIChpc0Vuc2VtYmxHZW5lKHdoZXJlLmdlbmUpKSB7XG5cdCAgICBnZXRfZW5zR2VuZSh3aGVyZS5nZW5lKVxuXHR9IGVsc2Uge1xuXHQgICAgZVJlc3QuY2FsbCh7dXJsIDogZVJlc3QudXJsLnhyZWYgKHsgc3BlY2llcyA6IHdoZXJlLnNwZWNpZXMsXG5cdFx0XHRcdFx0XHRuYW1lICAgIDogd2hlcmUuZ2VuZSBcblx0XHRcdFx0XHQgICAgICB9XG5cdFx0XHRcdFx0ICAgICApLFxuXHRcdFx0c3VjY2VzcyA6IGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdCAgICByZXNwID0gcmVzcC5maWx0ZXIoZnVuY3Rpb24oZCkge1xuXHRcdFx0XHRyZXR1cm4gIWQuaWQuaW5kZXhPZihcIkVOU1wiKTtcblx0XHRcdCAgICB9KTtcblx0XHRcdCAgICBpZiAocmVzcFswXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNvbmYueHJlZl9zZWFyY2gocmVzcCk7XG5cdFx0XHRcdGdldF9lbnNHZW5lKHJlc3BbMF0uaWQpXG5cdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0Z2Vub21lX2Jyb3dzZXIuc3RhcnQoKTtcblx0XHRcdCAgICB9XG5cdFx0XHR9XG5cdFx0ICAgICAgIH1cblx0XHQgICAgICApO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBnZXRfZW5zR2VuZSA9IGZ1bmN0aW9uIChpZCkge1xuXHRlUmVzdC5jYWxsKHt1cmwgICAgIDogZVJlc3QudXJsLmdlbmUgKHtpZCA6IGlkfSksXG5cdFx0ICAgIHN1Y2Nlc3MgOiBmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRjb25mLmVuc2dlbmVfc2VhcmNoKHJlc3ApO1xuXG5cdFx0XHR2YXIgZXh0cmEgPSB+figocmVzcC5lbmQgLSByZXNwLnN0YXJ0KSAqIChjb25mLmNvbnRleHQvMTAwKSk7XG5cdFx0XHRnZW5vbWVfYnJvd3NlclxuXHRcdFx0ICAgIC5zcGVjaWVzKHJlc3Auc3BlY2llcylcblx0XHRcdCAgICAuY2hyKHJlc3Auc2VxX3JlZ2lvbl9uYW1lKVxuXHRcdFx0ICAgIC5mcm9tKHJlc3Auc3RhcnQgLSBleHRyYSlcblx0XHRcdCAgICAudG8ocmVzcC5lbmQgKyBleHRyYSk7XG5cblx0XHRcdGdlbm9tZV9icm93c2VyLnN0YXJ0KCB7IHNwZWNpZXMgOiByZXNwLnNwZWNpZXMsXG5cdFx0XHRcdFx0ICBjaHIgICAgIDogcmVzcC5zZXFfcmVnaW9uX25hbWUsXG5cdFx0XHRcdFx0ICBmcm9tICAgIDogcmVzcC5zdGFydCAtIGV4dHJhLFxuXHRcdFx0XHRcdCAgdG8gICAgICA6IHJlc3AuZW5kICsgZXh0cmFcblx0XHRcdFx0XHR9ICk7XG5cdFx0ICAgIH1cblx0XHQgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHNwbGl0X2hvbW9sb2d1ZXMgPSBmdW5jdGlvbiAoaG9tb2xvZ3Vlcykge1xuXHR2YXIgb3J0aG9QYXR0ID0gL29ydGhvbG9nLztcblx0dmFyIHBhcmFQYXR0ID0gL3BhcmFsb2cvO1xuXG5cdHZhciBvcnRob2xvZ3VlcyA9IGhvbW9sb2d1ZXMuZmlsdGVyKGZ1bmN0aW9uKGQpe3JldHVybiBkLnR5cGUubWF0Y2gob3J0aG9QYXR0KX0pO1xuXHR2YXIgcGFyYWxvZ3VlcyAgPSBob21vbG9ndWVzLmZpbHRlcihmdW5jdGlvbihkKXtyZXR1cm4gZC50eXBlLm1hdGNoKHBhcmFQYXR0KX0pO1xuXG5cdHJldHVybiB7J29ydGhvbG9ndWVzJyA6IG9ydGhvbG9ndWVzLFxuXHRcdCdwYXJhbG9ndWVzJyAgOiBwYXJhbG9ndWVzfTtcbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzKGdlbm9tZV9icm93c2VyKVxuXHQuZ2V0c2V0IChjb25mKTtcblxuICAgIGFwaS5tZXRob2QgKHtcblx0c3RhcnQgICAgICA6IHN0YXJ0LFxuXHRob21vbG9ndWVzIDogaG9tb2xvZ3Vlc1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGdlbm9tZV9icm93c2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X2JvYXJkX2dlbm9tZTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG5ib2FyZC5nZW5vbWUgPSByZXF1aXJlKFwiLi9nZW5vbWVcIik7XG5ib2FyZC50cmFjay5sYXlvdXQuZmVhdHVyZSA9IHJlcXVpcmUoXCIuL2xheW91dFwiKTtcbmJvYXJkLnRyYWNrLmZlYXR1cmUuZ2VuZSA9IHJlcXVpcmUoXCIuL2ZlYXR1cmVcIik7XG5ib2FyZC50cmFjay5kYXRhLmdlbmUgPSByZXF1aXJlKFwiLi9kYXRhXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcblxuLy8gVGhlIG92ZXJsYXAgZGV0ZWN0b3IgdXNlZCBmb3IgZ2VuZXNcbnZhciBnZW5lX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBtYXhfc2xvdHM7XG5cbiAgICAvLyB2YXJzIGV4cG9zZWQgaW4gdGhlIEFQSTpcbiAgICB2YXIgY29uZiA9IHtcblx0aGVpZ2h0ICAgOiAxNTAsXG5cdHNjYWxlICAgIDogdW5kZWZpbmVkXG4gICAgfTtcblxuICAgIHZhciBjb25mX3JvID0ge1xuXHRlbGVtZW50cyA6IFtdXG4gICAgfTtcblxuICAgIHZhciBzbG90X3R5cGVzID0ge1xuXHQnZXhwYW5kZWQnICAgOiB7XG5cdCAgICBzbG90X2hlaWdodCA6IDMwLFxuXHQgICAgZ2VuZV9oZWlnaHQgOiAxMCxcblx0ICAgIHNob3dfbGFiZWwgIDogdHJ1ZVxuXHR9LFxuXHQnY29sbGFwc2VkJyA6IHtcblx0ICAgIHNsb3RfaGVpZ2h0IDogMTAsXG5cdCAgICBnZW5lX2hlaWdodCA6IDcsXG5cdCAgICBzaG93X2xhYmVsICA6IGZhbHNlXG5cdH1cbiAgICB9O1xuICAgIHZhciBjdXJyZW50X3Nsb3RfdHlwZSA9ICdleHBhbmRlZCc7XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciBnZW5lc19sYXlvdXQgPSBmdW5jdGlvbiAobmV3X2dlbmVzLCBzY2FsZSkge1xuXG5cdC8vIFdlIG1ha2Ugc3VyZSB0aGF0IHRoZSBnZW5lcyBoYXZlIG5hbWVcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBuZXdfZ2VuZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChuZXdfZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZSA9PT0gbnVsbCkge1xuXHRcdG5ld19nZW5lc1tpXS5leHRlcm5hbF9uYW1lID0gXCJcIjtcblx0ICAgIH1cblx0fVxuXG5cdG1heF9zbG90cyA9IH5+KGNvbmYuaGVpZ2h0IC8gc2xvdF90eXBlcy5leHBhbmRlZC5zbG90X2hlaWdodCkgLSAxO1xuXG5cdGlmIChzY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBnZW5lc19sYXlvdXQuc2NhbGUoc2NhbGUpO1xuXHR9XG5cblx0c2xvdF9rZWVwZXIobmV3X2dlbmVzLCBjb25mX3JvLmVsZW1lbnRzKTtcblx0dmFyIG5lZWRlZF9zbG90cyA9IGNvbGxpdGlvbl9kZXRlY3RvcihuZXdfZ2VuZXMpO1xuXHRpZiAobmVlZGVkX3Nsb3RzID4gbWF4X3Nsb3RzKSB7XG5cdCAgICBjdXJyZW50X3Nsb3RfdHlwZSA9ICdjb2xsYXBzZWQnO1xuXHR9IGVsc2Uge1xuXHQgICAgY3VycmVudF9zbG90X3R5cGUgPSAnZXhwYW5kZWQnO1xuXHR9XG5cblx0Y29uZl9yby5lbGVtZW50cyA9IG5ld19nZW5lcztcbiAgICB9O1xuXG4gICAgdmFyIGdlbmVfc2xvdCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHNsb3RfdHlwZXNbY3VycmVudF9zbG90X3R5cGVdO1xuICAgIH07XG5cbiAgICB2YXIgY29sbGl0aW9uX2RldGVjdG9yID0gZnVuY3Rpb24gKGdlbmVzKSB7XG5cdHZhciBnZW5lc19wbGFjZWQgPSBbXTtcblx0dmFyIGdlbmVzX3RvX3BsYWNlID0gZ2VuZXM7XG5cdHZhciBuZWVkZWRfc2xvdHMgPSAwO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZ2VuZXNbaV0uc2xvdCA+IG5lZWRlZF9zbG90cyAmJiBnZW5lc1tpXS5zbG90IDwgbWF4X3Nsb3RzKSB7XG5cdFx0bmVlZGVkX3Nsb3RzID0gZ2VuZXNbaV0uc2xvdFxuICAgICAgICAgICAgfVxuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lc190b19wbGFjZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdlbmVzX2J5X3Nsb3QgPSBzb3J0X2dlbmVzX2J5X3Nsb3QoZ2VuZXNfcGxhY2VkKTtcblx0ICAgIHZhciB0aGlzX2dlbmUgPSBnZW5lc190b19wbGFjZVtpXTtcblx0ICAgIGlmICh0aGlzX2dlbmUuc2xvdCAhPT0gdW5kZWZpbmVkICYmIHRoaXNfZ2VuZS5zbG90IDwgbWF4X3Nsb3RzKSB7XG5cdFx0aWYgKHNsb3RfaGFzX3NwYWNlKHRoaXNfZ2VuZSwgZ2VuZXNfYnlfc2xvdFt0aGlzX2dlbmUuc2xvdF0pKSB7XG5cdFx0ICAgIGdlbmVzX3BsYWNlZC5wdXNoKHRoaXNfZ2VuZSk7XG5cdFx0ICAgIGNvbnRpbnVlO1xuXHRcdH1cblx0ICAgIH1cbiAgICAgICAgICAgIHZhciBzbG90ID0gMDtcbiAgICAgICAgICAgIE9VVEVSOiB3aGlsZSAodHJ1ZSkge1xuXHRcdGlmIChzbG90X2hhc19zcGFjZSh0aGlzX2dlbmUsIGdlbmVzX2J5X3Nsb3Rbc2xvdF0pKSB7XG5cdFx0ICAgIHRoaXNfZ2VuZS5zbG90ID0gc2xvdDtcblx0XHQgICAgZ2VuZXNfcGxhY2VkLnB1c2godGhpc19nZW5lKTtcblx0XHQgICAgaWYgKHNsb3QgPiBuZWVkZWRfc2xvdHMpIHtcblx0XHRcdG5lZWRlZF9zbG90cyA9IHNsb3Q7XG5cdFx0ICAgIH1cblx0XHQgICAgYnJlYWs7XG5cdFx0fVxuXHRcdHNsb3QrKztcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gbmVlZGVkX3Nsb3RzICsgMTtcbiAgICB9O1xuXG4gICAgdmFyIHNsb3RfaGFzX3NwYWNlID0gZnVuY3Rpb24gKHF1ZXJ5X2dlbmUsIGdlbmVzX2luX3RoaXNfc2xvdCkge1xuXHRpZiAoZ2VuZXNfaW5fdGhpc19zbG90ID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHJldHVybiB0cnVlO1xuXHR9XG5cdGZvciAodmFyIGogPSAwOyBqIDwgZ2VuZXNfaW5fdGhpc19zbG90Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgc3Vial9nZW5lID0gZ2VuZXNfaW5fdGhpc19zbG90W2pdO1xuXHQgICAgaWYgKHF1ZXJ5X2dlbmUuaWQgPT09IHN1YmpfZ2VuZS5pZCkge1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuICAgICAgICAgICAgdmFyIHlfbGFiZWxfZW5kID0gc3Vial9nZW5lLmRpc3BsYXlfbGFiZWwubGVuZ3RoICogOCArIGNvbmYuc2NhbGUoc3Vial9nZW5lLnN0YXJ0KTsgLy8gVE9ETzogSXQgbWF5IGJlIGJldHRlciB0byBoYXZlIGEgZml4ZWQgZm9udCBzaXplIChpbnN0ZWFkIG9mIHRoZSBoYXJkY29kZWQgMTYpP1xuICAgICAgICAgICAgdmFyIHkxICA9IGNvbmYuc2NhbGUoc3Vial9nZW5lLnN0YXJ0KTtcbiAgICAgICAgICAgIHZhciB5MiAgPSBjb25mLnNjYWxlKHN1YmpfZ2VuZS5lbmQpID4geV9sYWJlbF9lbmQgPyBjb25mLnNjYWxlKHN1YmpfZ2VuZS5lbmQpIDogeV9sYWJlbF9lbmQ7XG5cdCAgICB2YXIgeF9sYWJlbF9lbmQgPSBxdWVyeV9nZW5lLmRpc3BsYXlfbGFiZWwubGVuZ3RoICogOCArIGNvbmYuc2NhbGUocXVlcnlfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeDEgPSBjb25mLnNjYWxlKHF1ZXJ5X2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHgyID0gY29uZi5zY2FsZShxdWVyeV9nZW5lLmVuZCkgPiB4X2xhYmVsX2VuZCA/IGNvbmYuc2NhbGUocXVlcnlfZ2VuZS5lbmQpIDogeF9sYWJlbF9lbmQ7XG4gICAgICAgICAgICBpZiAoICgoeDEgPCB5MSkgJiYgKHgyID4geTEpKSB8fFxuXHRcdCAoKHgxID4geTEpICYmICh4MSA8IHkyKSkgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXHR9XG5cdHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgc2xvdF9rZWVwZXIgPSBmdW5jdGlvbiAoZ2VuZXMsIHByZXZfZ2VuZXMpIHtcblx0dmFyIHByZXZfZ2VuZXNfc2xvdHMgPSBnZW5lczJzbG90cyhwcmV2X2dlbmVzKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocHJldl9nZW5lc19zbG90c1tnZW5lc1tpXS5pZF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdGdlbmVzW2ldLnNsb3QgPSBwcmV2X2dlbmVzX3Nsb3RzW2dlbmVzW2ldLmlkXTtcbiAgICAgICAgICAgIH1cblx0fVxuICAgIH07XG5cbiAgICB2YXIgZ2VuZXMyc2xvdHMgPSBmdW5jdGlvbiAoZ2VuZXNfYXJyYXkpIHtcblx0dmFyIGhhc2ggPSB7fTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lc19hcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdlbmUgPSBnZW5lc19hcnJheVtpXTtcbiAgICAgICAgICAgIGhhc2hbZ2VuZS5pZF0gPSBnZW5lLnNsb3Q7XG5cdH1cblx0cmV0dXJuIGhhc2g7XG4gICAgfVxuXG4gICAgdmFyIHNvcnRfZ2VuZXNfYnlfc2xvdCA9IGZ1bmN0aW9uIChnZW5lcykge1xuXHR2YXIgc2xvdHMgPSBbXTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNsb3RzW2dlbmVzW2ldLnNsb3RdID09PSB1bmRlZmluZWQpIHtcblx0XHRzbG90c1tnZW5lc1tpXS5zbG90XSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2xvdHNbZ2VuZXNbaV0uc2xvdF0ucHVzaChnZW5lc1tpXSk7XG5cdH1cblx0cmV0dXJuIHNsb3RzO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICB2YXIgYXBpID0gYXBpanMgKGdlbmVzX2xheW91dClcblx0LmdldHNldCAoY29uZilcblx0LmdldCAoY29uZl9ybylcblx0Lm1ldGhvZCAoe1xuXHQgICAgZ2VuZV9zbG90IDogZ2VuZV9zbG90XG5cdH0pO1xuXG4gICAgcmV0dXJuIGdlbmVzX2xheW91dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGdlbmVfbGF5b3V0O1xuIl19

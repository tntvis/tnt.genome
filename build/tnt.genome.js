(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
tnt.board = require("./index.js");
tnt.utils = require("tnt.utils");
tnt.tooltip = require("tnt.tooltip");
tnt.legend = require("tnt.legend");

},{"./index.js":2,"tnt.legend":23,"tnt.tooltip":25,"tnt.utils":27}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/index.js");


},{"./src/index.js":34}],3:[function(require,module,exports){
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

module.exports = require("./src/index");

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
	    var track_data = track.data();
	    var data_updater = track_data.update();
	    //var data_updater = track.data().update();
	    data_updater.call(track_data, {
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

},{"tnt.api":3,"tnt.utils":27}],7:[function(require,module,exports){
var apijs = require ("tnt.api");
// var ensemblRestAPI = require("tnt.ensembl");

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

    return _;
};

// The retrievers. They need to access 'elements'
data.retriever = {};

data.retriever.sync = function() {
    var update_track = function(obj) {
	// "this" is set to the data obj
        this.elements(update_track.retriever()(obj.loc));
        obj.on_success();
    };

    apijs (update_track)
	.getset ('retriever', function () {})

    return update_track;
};

data.retriever.async = function () {
    var url = '';

    // "this" is set to the data obj
    var data_obj = this;
    var update_track = function (obj) {
	d3.json(url, function (err, resp) {
	    data_obj.elements(resp);
	    obj.on_success();
	}); 
    };

    apijs (update_track)
	.getset ('url', '');

    return update_track;
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

},{"tnt.api":3}],8:[function(require,module,exports){
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

},{"tnt.api":3,"tnt.utils":27}],12:[function(require,module,exports){
module.exports = tnt_ensembl = require("./src/rest.js");

},{"./src/rest.js":22}],13:[function(require,module,exports){
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

},{"httpplease":14,"tnt.api":3}],23:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {};
// }
// tnt.legend = require("./src/legend.js");

var legend = require("./src/legend.js");
module.exports = exports = legend;

},{"./src/legend.js":24}],24:[function(require,module,exports){
var apijs = require ("tnt.api");
var board = require ("tnt.board");
var iterator = require("tnt.utils").iterator;

var tnt_legend = function (div) {

    d3.select(div)
	.attr("class", "tnt_framed");

    var opts = {
	row_height : 20,
	width      : 140,
	fontsize   : 12
    };

    var id = iterator(1);
    var legend_cols = [];

    var _ = function () {
	for (var i=0; i<legend_cols.length; i++) {
	    var col = legend_cols[i];
	    col.board(col.div);
	    col.board.start();
	}
    };

    var api = apijs (_)
	.getset(opts);

    api.method ('add_column', function () {
	var div_id = d3.select(div)
	    .style("display", "table")
	    .attr("id");

	var new_div = d3.select(div)
	    .append("div")
	    .attr("id", div_id + "_" + id())
	    .style("display", "table-cell");

	var new_board = board()
	    .right(2)
	    .from (1)
	    .to (2)
	    .allow_drag (false)
	    .show_frame (false)
	    .width (opts.width);

	new_board.add_row = new_board.add_track;

	legend_cols.push ({
	    'div' : new_div.node(),
	    'board' : new_board
	});

	return new_board;
    });

    api.method ('header', function (text) {
	var feature = board.track.feature();

	feature.create (function (g, xScale) {
	    var track = this;
	    g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", xScale(1))
		.attr("y", ~~track.height()/2)
		.attr("font-weight", "bold")
		.text(track.text());
	});

	var track = legend_track()
	    .display (feature);

	return track;
    });

    api.method ('text', function () {
	var track = legend_track()
	    .deploy (function () {
		var g = this;
		d3.select(g)
		    .append("text")
		    .attr("x", 0)
		    .attr("y", ~~(track.height() / 2) + 4)
		    .attr("fill", track.color())
		    .attr("font-size", track.fontsize())
		    .text(track.feature_text());
	    });

	apijs (track)
	    .getset ('feature_text', '');
	
	return track;
    });

    api.method ('hline', function () {
	var track = legend_track()
	    .deploy (function () {
		var g = this;
		d3.select(g)
		    .append("line")
		    .attr("x1", 0)
		    .attr("x2", track.feature_width())
		    .attr("y1", ~~(track.height()/2))
		    .attr("y2", ~~(track.height()/2))
		    .attr("stroke-width", 2)
		    .attr("stroke", track.color());
	    });

	return track;

    });

    api.method ('vline', function () {
	var track = legend_track()
	    .deploy (function () {
		var g = this;
		d3.select(g)
		    .append("line")
		    .attr("stroke", track.color())
		    .attr("stroke-width", 2)
		    .attr("x1", 5)
		    .attr("x2", 5)
		    .attr("y1", 0)
		    .attr("y2", track.height());
	    });

	return track;
    });

    api.method ('square', function () {
	var track = legend_track()
	    .deploy (function () {
		var w_h = ~~(track.height()*0.8);
		var g = this;
		d3.select(g)
		    .append("rect")
		    .attr("x", 0)
		    .attr("y", track.height() - w_h)
		    .attr("width", w_h)
		    .attr("height", w_h)
		    .attr("fill", track.color());
	    });

	return track;
    });

    api.method ('circle', function () {
	var feature = board.track.feature()
	feature.create (function (g, xScale) {
	    var track = this;
	    var rad = ~~(track.height()/2);
	    g
		.append("circle")
		.attr("cx", rad)
		.attr("cy", ~~(rad/2))
		.attr("r", rad-2)
		.attr("fill", track.color());
	    g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", 40)
		.attr("y", ~~(track.height()/2 + 4))
		.text(track.text());
	});

	var track = legend_track()
	    .display (feature);

	return track;
    });

    api.method ('gradient', function () {
	var feature = board.track.feature()
	feature.create (function (g, xScale) {
	    var grad_width = 100;
	    var track = this;
	    var gradient = g
		.append("linearGradient")
		.attr("x1", "0%")
		.attr("x2", "100%")
		.attr("y1", "0%")
		.attr("y2", "0%")
		.attr("id", d3.select(div).attr("id") + "_gradient");

	    gradient
		.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", track.color1())
		.attr("stop-opacity", 1);

	    gradient
		.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", track.color2())
		.attr("stop-opacity", 1);

	    var scale = d3.scale.linear()
		.domain([track.from(), track.to()])
		.range([0,grad_width]);
	    var axis = d3.svg.axis().scale(scale).tickSize(0).ticks(3);
	    var grad_g = g
		.append("g")
		.attr("transform", "translate(5,0)");

	    var axis_g = g
		.append("g")
		.attr("transform", "translate(5," + (track.height()-10) + ")")
		.call(axis);

	    grad_g
		.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", grad_width)
		.attr("height", ~~(track.height()-10))
		.attr("fill", "url(#" + d3.select(div).attr("id") + "_gradient)");

	    grad_g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", 110)
		.attr("y", ~~(track.height()/2))
		.text(track.text());
	});

	// the general track
	var track = legend_track()
	    .display (feature);
	track.color = undefined;
	var api = apijs(track);
	api
	    .getset ("color1", "yellow")
	    .getset ("color2", "red")
	    .getset ("from", 0)
	    .getset ("to", 100)

	return track;
    });


    api.method ('range', function () {
	var feature = board.track.feature()
	feature.create (function (g, xScale) {
	    var track = this;
	    var grad_width = 100;
	    var gradient = g
		.append("linearGradient")
		.attr("x1", "0%")
		.attr("x2", "100%")
		.attr("y1", "0%")
		.attr("y2", "0%")
		.attr("id", d3.select(div).attr("id") + "_range");
	    gradient
		.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", track.color1())
		.attr("stop-opacity", 1);
	    gradient
		.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", track.color2())
		.attr("stop-opacity", 1);

	    var scale = d3.scale.linear()
		.domain([track.from(), track.to()])
		.range([0, grad_width]);

	    var brush = d3.svg.brush()
		.x(scale)
		.extent([track.from(), track.to()])
		.on("brushstart", brushstart)
		.on("brush", brushmove)
		.on("brushend", brushend);

	    var brushg = g
		.append("g")
		.attr("transform", "translate(5,5)")
		.call (brush);

	    brushg.selectAll(".resize").append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", 0)
		.attr("y2", (track.height()/2 - 2))
		.style("stroke", "black")
		.style("stroke-width", 2);

	    brushg.selectAll(".resize").append("path")
		.attr("d", "M0,0L-3,-4L3,-4L0,0")
		.attr("fill", "black");

	    brushg.selectAll ("rect")
		.classed("tnt_legend_range", true)
		.attr("height", track.height()/2 - 2)
		.attr("fill", "url(#" + d3.select(div).attr("id") + "_range)");

	    brushg
		.append("rect")
		.attr("class", "tnt_legend_range_pre")
		.attr("x", 0)
		.attr("y", 0)
		.attr("height", track.height()/2 - 2)
		.attr("fill", track.color1());

	    brushg
		.append("rect")
		.attr("class", "tnt_legend_range_post")
		.attr("y", 0)
		.attr("height", track.height()/2 - 2)
		.attr("fill", track.color2());

	    brushstart();
	    brushmove();

	    var axis = d3.svg.axis().scale(scale).tickSize(0).ticks(3);
	    var axis_g = g
		.append("g")
		.attr("transform", "translate(5," + (track.height()-10) + ")")
		.call(axis);

	    g
		.append("text")
		.attr("fill", "black")
		.attr("font-size", track.fontsize())
		.attr("x", 115)
		.attr("y", ~~(track.height()/2 + 3))
		.text(track.text());

	    function brushstart () {
	    }
	    function brushmove () {
		console.log(brush.extent());
		brushg.selectAll (".tnt_legend_rect")
		    .attr("fill", "url(#" + d3.select(div).attr("id") + "_range)");
		brushg.selectAll (".tnt_legend_range_pre")
		    .attr("width", scale(brush.extent()[0])-1)
		brushg.selectAll (".tnt_legend_range_post")
		    .attr("x", scale(brush.extent()[1])+1)
		    .attr("width",  grad_width - scale(brush.extent()[1]));
		track.on_change().call(brush);
	    }
	    function brushend () {
		console.log(brush.extent());
	    }

	});

	var track = legend_track()
	    .display (feature);
	track.color = undefined;
	var api = apijs(track);
	api
	    .getset ("color1", "yellow")
	    .getset ("color2", "red")
	    .getset ("from", 0)
	    .getset ("to", 100)
	    .getset ("on_change", function (){});

	return track;
    });


    api.method ('empty', function (color, desc) {
	var track = board.track()
	    .height(opts.row_height)
	    .background_color("white")
	    .data(null)
	    .display(null);

	return track;
    });

    var legend_track = function () {
	var feature = board.track.feature();
	feature.create (function (g, xScale) {
	    var track = this;
	    // feature
	    var feature_g = g
		.append("g");
	    
	    track.deploy().call(feature_g.node());

	    // label
	    g
		.append("g")
		.attr("transform", "translate(" + (track.feature_width() + 5) + ", 0)")
		.append("text")
		.attr("fill", "black")
		.attr("x", 0)
		.attr("y", ~~(track.height()/2) + 4) // TODO: Don't hardcode the 4
		.attr("font-size", track.fontsize())
		.text(track.text());
	});

	var track = board.track();

	var api = apijs (track)
	    .getset ('color', 'black')
	    .getset ('text', '')
	    .getset ('height', opts.row_height)
	    .getset ('fontsize', opts.fontsize)
	    .getset ('feature_width', 40)
	    .getset ('deploy', function () {
		throw ('deploy is not defined in the legend base class');
	    });

	track
	    .height (track.height())
	    .background_color ("white")
	    .data (board.track.data()
		   .update(
		       board.track.data.retriever.sync()
			   .retriever (function () {
			       return [{}];
			   })
		       )
		  )
	    .display (feature);

	return track;
    };

    return _;
};

module.exports = exports = tnt_legend;

},{"tnt.api":3,"tnt.board":5,"tnt.utils":27}],25:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":26}],26:[function(require,module,exports){
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

},{"tnt.api":3}],27:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":28}],28:[function(require,module,exports){
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

},{"./reduce.js":29,"./utils.js":30}],29:[function(require,module,exports){
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


},{}],30:[function(require,module,exports){

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

},{}],31:[function(require,module,exports){
var board = require("tnt.board");
var apijs = require("tnt.api");
var ensemblRestAPI = require("tnt.ensembl");

// A predefined track for genes
var data_gene = function () {
//board.track.data.gene = function () {

    var track = board.track.data();
    // .index("ID");

    board.track.data.retriever.ensembl = function () {
	var success = [function () {}];
	var endpoint;
	var eRest = ensemblRestAPI();
	var update_track = function (obj) {
	    var data_parent = this;
	    // Object has loc and a plug-in defined callback
	    var loc = obj.loc;
	    var plugin_cbak = obj.on_success;
	    eRest.call({
		url: eRest.url[update_track.endpoint()](loc),
		success: function (resp) {
		    data_parent.elements(resp);

		    // User defined
		    for (var i=0; i<success.length; i++) {
			success[i](resp);
		    }

		    // plug-in defined
		    plugin_cbak();
		}
	    });
	};
	apijs (update_track)
	    .getset ('endpoint');

	// TODO: We don't have a way of resetting the success array
	// TODO: Should this also be included in the sync retriever?
	// Still not sure this is the best option to support more than one callback
	update_track.success = function (cb) {
	    if (!arguments.length) {
		return success;
	    }
	    success.push (cb);
	    return update_track;
	};

	return update_track;
    };
    
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

},{"tnt.api":3,"tnt.board":5,"tnt.ensembl":12}],32:[function(require,module,exports){
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

},{"./layout.js":35,"tnt.api":3,"tnt.board":5}],33:[function(require,module,exports){
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

},{"./feature.js":32,"./layout.js":35,"tnt.api":3,"tnt.board":5,"tnt.ensembl":12}],34:[function(require,module,exports){
var board = require("tnt.board");
board.genome = require("./genome");
board.track.layout.feature = require("./layout");
board.track.feature.gene = require("./feature");
board.track.data.gene = require("./data");

module.exports = exports = board;


},{"./data":31,"./feature":32,"./genome":33,"./layout":35,"tnt.board":5}],35:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL2Zha2VfZTk3ZDQwYzguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9ib2FyZC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2RhdGEuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy90cmFjay5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvZXJyb3IuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXNwb25zZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvdXRpbHMvZGVsYXkuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3V0aWxzL29uY2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3hoci1icm93c2VyLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2NsZWFudXJsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL3NyYy9yZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5sZWdlbmQvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmxlZ2VuZC9zcmMvbGVnZW5kLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL3NyYy90b29sdGlwLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvcmVkdWNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvc3JjL2dlbm9tZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9sYXlvdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNocUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge307XG59XG50bnQuYm9hcmQgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcbnRudC51dGlscyA9IHJlcXVpcmUoXCJ0bnQudXRpbHNcIik7XG50bnQudG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcbnRudC5sZWdlbmQgPSByZXF1aXJlKFwidG50LmxlZ2VuZFwiKTtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2FwaS5qc1wiKTtcbiIsInZhciBhcGkgPSBmdW5jdGlvbiAod2hvKSB7XG5cbiAgICB2YXIgX21ldGhvZHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBtID0gW107XG5cblx0bS5hZGRfYmF0Y2ggPSBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICBtLnVuc2hpZnQob2JqKTtcblx0fTtcblxuXHRtLnVwZGF0ZSA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRtW2ldW3BdID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBmYWxzZTtcblx0fTtcblxuXHRtLmFkZCA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBpZiAobS51cGRhdGUgKG1ldGhvZCwgdmFsdWUpICkge1xuXHQgICAgfSBlbHNlIHtcblx0XHR2YXIgcmVnID0ge307XG5cdFx0cmVnW21ldGhvZF0gPSB2YWx1ZTtcblx0XHRtLmFkZF9iYXRjaCAocmVnKTtcblx0ICAgIH1cblx0fTtcblxuXHRtLmdldCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdHJldHVybiBtW2ldW3BdO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHR9O1xuXG5cdHJldHVybiBtO1xuICAgIH07XG5cbiAgICB2YXIgbWV0aG9kcyAgICA9IF9tZXRob2RzKCk7XG4gICAgdmFyIGFwaSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgYXBpLmNoZWNrID0gZnVuY3Rpb24gKG1ldGhvZCwgY2hlY2ssIG1zZykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkuY2hlY2sobWV0aG9kW2ldLCBjaGVjaywgbXNnKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC5jaGVjayhjaGVjaywgbXNnKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobWV0aG9kLCBjYmFrKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS50cmFuc2Zvcm0gKG1ldGhvZFtpXSwgY2Jhayk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QudHJhbnNmb3JtIChjYmFrKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLnRyYW5zZm9ybShjYmFrKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICB2YXIgYXR0YWNoX21ldGhvZCA9IGZ1bmN0aW9uIChtZXRob2QsIG9wdHMpIHtcblx0dmFyIGNoZWNrcyA9IFtdO1xuXHR2YXIgdHJhbnNmb3JtcyA9IFtdO1xuXG5cdHZhciBnZXR0ZXIgPSBvcHRzLm9uX2dldHRlciB8fCBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbWV0aG9kcy5nZXQobWV0aG9kKTtcblx0fTtcblxuXHR2YXIgc2V0dGVyID0gb3B0cy5vbl9zZXR0ZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0eCA9IHRyYW5zZm9ybXNbaV0oeCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIGo9MDsgajxjaGVja3MubGVuZ3RoOyBqKyspIHtcblx0XHRpZiAoIWNoZWNrc1tqXS5jaGVjayh4KSkge1xuXHRcdCAgICB2YXIgbXNnID0gY2hlY2tzW2pdLm1zZyB8fCBcblx0XHRcdChcIlZhbHVlIFwiICsgeCArIFwiIGRvZXNuJ3Qgc2VlbSB0byBiZSB2YWxpZCBmb3IgdGhpcyBtZXRob2RcIik7XG5cdFx0ICAgIHRocm93IChtc2cpO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIG1ldGhvZHMuYWRkKG1ldGhvZCwgeCk7XG5cdH07XG5cblx0dmFyIG5ld19tZXRob2QgPSBmdW5jdGlvbiAobmV3X3ZhbCkge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGdldHRlcigpO1xuXHQgICAgfVxuXHQgICAgc2V0dGVyKG5ld192YWwpO1xuXHQgICAgcmV0dXJuIHdobzsgLy8gUmV0dXJuIHRoaXM/XG5cdH07XG5cdG5ld19tZXRob2QuY2hlY2sgPSBmdW5jdGlvbiAoY2JhaywgbXNnKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY2hlY2tzO1xuXHQgICAgfVxuXHQgICAgY2hlY2tzLnB1c2ggKHtjaGVjayA6IGNiYWssXG5cdFx0XHQgIG1zZyAgIDogbXNnfSk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblx0bmV3X21ldGhvZC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRyYW5zZm9ybXM7XG5cdCAgICB9XG5cdCAgICB0cmFuc2Zvcm1zLnB1c2goY2Jhayk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblxuXHR3aG9bbWV0aG9kXSA9IG5ld19tZXRob2Q7XG4gICAgfTtcblxuICAgIHZhciBnZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIG9wdHMpIHtcblx0aWYgKHR5cGVvZiAocGFyYW0pID09PSAnb2JqZWN0Jykge1xuXHQgICAgbWV0aG9kcy5hZGRfYmF0Y2ggKHBhcmFtKTtcblx0ICAgIGZvciAodmFyIHAgaW4gcGFyYW0pIHtcblx0XHRhdHRhY2hfbWV0aG9kIChwLCBvcHRzKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIG1ldGhvZHMuYWRkIChwYXJhbSwgb3B0cy5kZWZhdWx0X3ZhbHVlKTtcblx0ICAgIGF0dGFjaF9tZXRob2QgKHBhcmFtLCBvcHRzKTtcblx0fVxuICAgIH07XG5cbiAgICBhcGkuZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZn0pO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5nZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fc2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIGdldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgc2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX3NldHRlciA6IG9uX3NldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuc2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX2dldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBzZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIGdldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9nZXR0ZXIgOiBvbl9nZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBjYmFrKSB7XG5cdGlmICh0eXBlb2YgKG5hbWUpID09PSAnb2JqZWN0Jykge1xuXHQgICAgZm9yICh2YXIgcCBpbiBuYW1lKSB7XG5cdFx0d2hvW3BdID0gbmFtZVtwXTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIHdob1tuYW1lXSA9IGNiYWs7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgICBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGFwaTsiLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbi8vIHRudC51dGlscyA9IHJlcXVpcmUoXCJ0bnQudXRpbHNcIik7XG4vLyB0bnQudG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcbi8vIHRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXhcIik7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgZGVmZXJDYW5jZWwgPSByZXF1aXJlIChcInRudC51dGlsc1wiKS5kZWZlcl9jYW5jZWw7XG5cbnZhciBib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIFxuICAgIC8vLy8gUHJpdmF0ZSB2YXJzXG4gICAgdmFyIHN2ZztcbiAgICB2YXIgZGl2X2lkO1xuICAgIHZhciB0cmFja3MgPSBbXTtcbiAgICB2YXIgbWluX3dpZHRoID0gNTA7XG4gICAgdmFyIGhlaWdodCAgICA9IDA7ICAgIC8vIFRoaXMgaXMgdGhlIGdsb2JhbCBoZWlnaHQgaW5jbHVkaW5nIGFsbCB0aGUgdHJhY2tzXG4gICAgdmFyIHdpZHRoICAgICA9IDkyMDtcbiAgICB2YXIgaGVpZ2h0X29mZnNldCA9IDIwO1xuICAgIHZhciBsb2MgPSB7XG5cdHNwZWNpZXMgIDogdW5kZWZpbmVkLFxuXHRjaHIgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgZnJvbSAgICAgOiAwLFxuICAgICAgICB0byAgICAgICA6IDUwMFxuICAgIH07XG5cbiAgICAvLyBUT0RPOiBXZSBoYXZlIG5vdyBiYWNrZ3JvdW5kIGNvbG9yIGluIHRoZSB0cmFja3MuIENhbiB0aGlzIGJlIHJlbW92ZWQ/XG4gICAgLy8gSXQgbG9va3MgbGlrZSBpdCBpcyB1c2VkIGluIHRoZSB0b28td2lkZSBwYW5lIGV0YywgYnV0IGl0IG1heSBub3QgYmUgbmVlZGVkIGFueW1vcmVcbiAgICB2YXIgYmdDb2xvciAgID0gZDMucmdiKCcjRjhGQkVGJyk7IC8vI0Y4RkJFRlxuICAgIHZhciBwYW5lOyAvLyBEcmFnZ2FibGUgcGFuZVxuICAgIHZhciBzdmdfZztcbiAgICB2YXIgeFNjYWxlO1xuICAgIHZhciB6b29tRXZlbnRIYW5kbGVyID0gZDMuYmVoYXZpb3Iuem9vbSgpO1xuICAgIHZhciBsaW1pdHMgPSB7XG5cdGxlZnQgOiAwLFxuXHRyaWdodCA6IDEwMDAsXG5cdHpvb21fb3V0IDogMTAwMCxcblx0em9vbV9pbiAgOiAxMDBcbiAgICB9O1xuICAgIHZhciBjYXBfd2lkdGggPSAzO1xuICAgIHZhciBkdXIgPSA1MDA7XG4gICAgdmFyIGRyYWdfYWxsb3dlZCA9IHRydWU7XG5cbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0ZWFzZSAgICAgICAgICA6IGQzLmVhc2UoXCJjdWJpYy1pbi1vdXRcIiksXG5cdGV4dGVuZF9jYW52YXMgOiB7XG5cdCAgICBsZWZ0IDogMCxcblx0ICAgIHJpZ2h0IDogMFxuXHR9LFxuXHRzaG93X2ZyYW1lIDogdHJ1ZVxuXHQvLyBsaW1pdHMgICAgICAgIDogZnVuY3Rpb24gKCkge3Rocm93IFwiVGhlIGxpbWl0cyBtZXRob2Qgc2hvdWxkIGJlIGRlZmluZWRcIn1cdFxuICAgIH07XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciB0cmFja192aXMgPSBmdW5jdGlvbihkaXYpIHtcblx0ZGl2X2lkID0gZDMuc2VsZWN0KGRpdikuYXR0cihcImlkXCIpO1xuXG5cdC8vIFRoZSBvcmlnaW5hbCBkaXYgaXMgY2xhc3NlZCB3aXRoIHRoZSB0bnQgY2xhc3Ncblx0ZDMuc2VsZWN0KGRpdilcblx0ICAgIC5jbGFzc2VkKFwidG50XCIsIHRydWUpO1xuXG5cdC8vIFRPRE86IE1vdmUgdGhlIHN0eWxpbmcgdG8gdGhlIHNjc3M/XG5cdHZhciBicm93c2VyRGl2ID0gZDMuc2VsZWN0KGRpdilcblx0ICAgIC5hcHBlbmQoXCJkaXZcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG5cdCAgICAuY2xhc3NlZChcInRudF9mcmFtZWRcIiwgZXhwb3J0cy5zaG93X2ZyYW1lID8gdHJ1ZSA6IGZhbHNlKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgKHdpZHRoICsgY2FwX3dpZHRoKjIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMucmlnaHQgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCkgKyBcInB4XCIpXG5cblx0dmFyIGdyb3VwRGl2ID0gYnJvd3NlckRpdlxuXHQgICAgLmFwcGVuZChcImRpdlwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ncm91cERpdlwiKTtcblxuXHQvLyBUaGUgU1ZHXG5cdHN2ZyA9IGdyb3VwRGl2XG5cdCAgICAuYXBwZW5kKFwic3ZnXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3N2Z1wiKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0ICAgIC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIik7XG5cblx0c3ZnX2cgPSBzdmdcblx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLDIwKVwiKVxuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ1wiKTtcblxuXHQvLyBjYXBzXG5cdHN2Z19nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdCAgICAuYXR0cihcInhcIiwgMClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXHRzdmdfZ1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIHdpZHRoLWNhcF93aWR0aClcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXG5cdC8vIFRoZSBab29taW5nL1Bhbm5pbmcgUGFuZVxuXHRwYW5lID0gc3ZnX2dcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3BhbmVcIilcblx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl9wYW5lXCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHQgICAgLnN0eWxlKFwiZmlsbFwiLCBiZ0NvbG9yKTtcblxuXHQvLyAqKiBUT0RPOiBXb3VsZG4ndCBiZSBiZXR0ZXIgdG8gaGF2ZSB0aGVzZSBtZXNzYWdlcyBieSB0cmFjaz9cblx0Ly8gdmFyIHRvb1dpZGVfdGV4dCA9IHN2Z19nXG5cdC8vICAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHQvLyAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF93aWRlT0tfdGV4dFwiKVxuXHQvLyAgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiX3Rvb1dpZGVcIilcblx0Ly8gICAgIC5hdHRyKFwiZmlsbFwiLCBiZ0NvbG9yKVxuXHQvLyAgICAgLnRleHQoXCJSZWdpb24gdG9vIHdpZGVcIik7XG5cblx0Ly8gVE9ETzogSSBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IChhbmQgcG9ydGFibGUpIHdheVxuXHQvLyBvZiBjZW50ZXJpbmcgdGhlIHRleHQgaW4gdGhlIHRleHQgYXJlYVxuXHQvLyB2YXIgYmIgPSB0b29XaWRlX3RleHRbMF1bMF0uZ2V0QkJveCgpO1xuXHQvLyB0b29XaWRlX3RleHRcblx0Ly8gICAgIC5hdHRyKFwieFwiLCB+fih3aWR0aC8yIC0gYmIud2lkdGgvMikpXG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaGVpZ2h0LzIgLSBiYi5oZWlnaHQvMikpO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICB2YXIgYXBpID0gYXBpanMgKHRyYWNrX3Zpcylcblx0LmdldHNldCAoZXhwb3J0cylcblx0LmdldHNldCAobGltaXRzKVxuXHQuZ2V0c2V0IChsb2MpO1xuXG4gICAgYXBpLnRyYW5zZm9ybSAodHJhY2tfdmlzLmV4dGVuZF9jYW52YXMsIGZ1bmN0aW9uICh2YWwpIHtcblx0dmFyIHByZXZfdmFsID0gdHJhY2tfdmlzLmV4dGVuZF9jYW52YXMoKTtcblx0dmFsLmxlZnQgPSB2YWwubGVmdCB8fCBwcmV2X3ZhbC5sZWZ0O1xuXHR2YWwucmlnaHQgPSB2YWwucmlnaHQgfHwgcHJldl92YWwucmlnaHQ7XG5cdHJldHVybiB2YWw7XG4gICAgfSk7XG5cbiAgICAvLyB0cmFja192aXMgYWx3YXlzIHN0YXJ0cyBvbiBsb2MuZnJvbSAmIGxvYy50b1xuICAgIGFwaS5tZXRob2QgKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcblxuXHQvLyBSZXNldCB0aGUgdHJhY2tzXG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFja3NbaV0uZykge1xuXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkucmVzZXQuY2FsbCh0cmFja3NbaV0pO1xuXHQgICAgfVxuXHQgICAgX2luaXRfdHJhY2sodHJhY2tzW2ldKTtcblx0fVxuXG5cdF9wbGFjZV90cmFja3MoKTtcblxuXHQvLyBUaGUgY29udGludWF0aW9uIGNhbGxiYWNrXG5cdHZhciBjb250ID0gZnVuY3Rpb24gKHJlc3ApIHtcblx0ICAgIGxpbWl0cy5yaWdodCA9IHJlc3A7XG5cblx0ICAgIC8vIHpvb21FdmVudEhhbmRsZXIueEV4dGVudChbbGltaXRzLmxlZnQsIGxpbWl0cy5yaWdodF0pO1xuXHQgICAgaWYgKChsb2MudG8gLSBsb2MuZnJvbSkgPCBsaW1pdHMuem9vbV9pbikge1xuXHRcdGlmICgobG9jLmZyb20gKyBsaW1pdHMuem9vbV9pbikgPiBsaW1pdHMuem9vbV9pbikge1xuXHRcdCAgICBsb2MudG8gPSBsaW1pdHMucmlnaHQ7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgbG9jLnRvID0gbG9jLmZyb20gKyBsaW1pdHMuem9vbV9pbjtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBwbG90KCk7XG5cblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHRfdXBkYXRlX3RyYWNrKHRyYWNrc1tpXSwgbG9jKTtcblx0ICAgIH1cblx0fTtcblxuXHQvLyBJZiBsaW1pdHMucmlnaHQgaXMgYSBmdW5jdGlvbiwgd2UgaGF2ZSB0byBjYWxsIGl0IGFzeW5jaHJvbm91c2x5IGFuZFxuXHQvLyB0aGVuIHN0YXJ0aW5nIHRoZSBwbG90IG9uY2Ugd2UgaGF2ZSBzZXQgdGhlIHJpZ2h0IGxpbWl0IChwbG90KVxuXHQvLyBJZiBub3QsIHdlIGFzc3VtZSB0aGF0IGl0IGlzIGFuIG9iamV0IHdpdGggbmV3IChtYXliZSBwYXJ0aWFsbHkgZGVmaW5lZClcblx0Ly8gZGVmaW5pdGlvbnMgb2YgdGhlIGxpbWl0cyBhbmQgd2UgY2FuIHBsb3QgZGlyZWN0bHlcblx0Ly8gVE9ETzogUmlnaHQgbm93LCBvbmx5IHJpZ2h0IGNhbiBiZSBjYWxsZWQgYXMgYW4gYXN5bmMgZnVuY3Rpb24gd2hpY2ggaXMgd2Vha1xuXHRpZiAodHlwZW9mIChsaW1pdHMucmlnaHQpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBsaW1pdHMucmlnaHQoY29udCk7XG5cdH0gZWxzZSB7XG5cdCAgICBjb250KGxpbWl0cy5yaWdodCk7XG5cdH1cblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX3VwZGF0ZV90cmFjayAodHJhY2tzW2ldKTtcblx0fVxuXG4gICAgfSk7XG5cbiAgICB2YXIgX3VwZGF0ZV90cmFjayA9IGZ1bmN0aW9uICh0cmFjaywgd2hlcmUpIHtcblx0aWYgKHRyYWNrLmRhdGEoKSkge1xuXHQgICAgdmFyIHRyYWNrX2RhdGEgPSB0cmFjay5kYXRhKCk7XG5cdCAgICB2YXIgZGF0YV91cGRhdGVyID0gdHJhY2tfZGF0YS51cGRhdGUoKTtcblx0ICAgIC8vdmFyIGRhdGFfdXBkYXRlciA9IHRyYWNrLmRhdGEoKS51cGRhdGUoKTtcblx0ICAgIGRhdGFfdXBkYXRlci5jYWxsKHRyYWNrX2RhdGEsIHtcblx0XHQnbG9jJyA6IHdoZXJlLFxuXHRcdCdvbl9zdWNjZXNzJyA6IGZ1bmN0aW9uICgpIHtcblx0XHQgICAgdHJhY2suZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUpO1xuXHRcdH1cblx0ICAgIH0pO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24oKSB7XG5cblx0eFNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcblx0ICAgIC5kb21haW4oW2xvYy5mcm9tLCBsb2MudG9dKVxuXHQgICAgLnJhbmdlKFswLCB3aWR0aF0pO1xuXG5cdGlmIChkcmFnX2FsbG93ZWQpIHtcblx0ICAgIHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXJcblx0XHQgICAgICAgLngoeFNjYWxlKVxuXHRcdCAgICAgICAuc2NhbGVFeHRlbnQoWyhsb2MudG8tbG9jLmZyb20pLyhsaW1pdHMuem9vbV9vdXQtMSksIChsb2MudG8tbG9jLmZyb20pL2xpbWl0cy56b29tX2luXSlcblx0XHQgICAgICAgLm9uKFwiem9vbVwiLCBfbW92ZSlcblx0XHQgICAgICk7XG5cdH1cblxuICAgIH07XG5cbiAgICAvLyByaWdodC9sZWZ0L3pvb20gcGFucyBvciB6b29tcyB0aGUgdHJhY2suIFRoZXNlIG1ldGhvZHMgYXJlIGV4cG9zZWQgdG8gYWxsb3cgZXh0ZXJuYWwgYnV0dG9ucywgZXRjIHRvIGludGVyYWN0IHdpdGggdGhlIHRyYWNrcy4gVGhlIGFyZ3VtZW50IGlzIHRoZSBhbW91bnQgb2YgcGFubmluZy96b29taW5nIChpZS4gMS4yIG1lYW5zIDIwJSBwYW5uaW5nKSBXaXRoIGxlZnQvcmlnaHQgb25seSBwb3NpdGl2ZSBudW1iZXJzIGFyZSBhbGxvd2VkLlxuICAgIGFwaS5tZXRob2QgKCdtb3ZlX3JpZ2h0JywgZnVuY3Rpb24gKGZhY3Rvcikge1xuXHRpZiAoZmFjdG9yID4gMCkge1xuXHQgICAgX21hbnVhbF9tb3ZlKGZhY3RvciwgMSk7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdtb3ZlX2xlZnQnLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG5cdGlmIChmYWN0b3IgPiAwKSB7XG5cdCAgICBfbWFudWFsX21vdmUoZmFjdG9yLCAtMSk7XG5cdH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd6b29tJywgZnVuY3Rpb24gKGZhY3Rvcikge1xuXHRfbWFudWFsX21vdmUoZmFjdG9yLCAwKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdmaW5kX3RyYWNrX2J5X2lkJywgZnVuY3Rpb24gKGlkKSB7XG5cdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0cmFja3NbaV0uaWQoKSA9PT0gaWQpIHtcblx0XHRyZXR1cm4gdHJhY2tzW2ldO1xuXHQgICAgfVxuXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgncmVvcmRlcicsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG5cdC8vIFRPRE86IFRoaXMgaXMgZGVmaW5pbmcgYSBuZXcgaGVpZ2h0LCBidXQgdGhlIGdsb2JhbCBoZWlnaHQgaXMgdXNlZCB0byBkZWZpbmUgdGhlIHNpemUgb2Ygc2V2ZXJhbFxuXHQvLyBwYXJ0cy4gV2Ugc2hvdWxkIGRvIHRoaXMgZHluYW1pY2FsbHlcblxuXHRmb3IgKHZhciBqPTA7IGo8bmV3X3RyYWNrcy5sZW5ndGg7IGorKykge1xuXHQgICAgdmFyIGZvdW5kID0gZmFsc2U7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKHRyYWNrc1tpXS5pZCgpID09PSBuZXdfdHJhY2tzW2pdLmlkKCkpIHtcblx0XHQgICAgZm91bmQgPSB0cnVlO1xuXHRcdCAgICB0cmFja3Muc3BsaWNlKGksMSk7XG5cdFx0ICAgIGJyZWFrO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIGlmICghZm91bmQpIHtcblx0XHRfaW5pdF90cmFjayhuZXdfdHJhY2tzW2pdKTtcblx0XHRfdXBkYXRlX3RyYWNrKG5ld190cmFja3Nbal0sIHtmcm9tIDogbG9jLmZyb20sIHRvIDogbG9jLnRvfSk7XG5cdCAgICB9XG5cdH1cblxuXHRmb3IgKHZhciB4PTA7IHg8dHJhY2tzLmxlbmd0aDsgeCsrKSB7XG5cdCAgICB0cmFja3NbeF0uZy5yZW1vdmUoKTtcblx0fVxuXG5cdHRyYWNrcyA9IG5ld190cmFja3M7XG5cdF9wbGFjZV90cmFja3MoKTtcblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3JlbW92ZV90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nLnJlbW92ZSgpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuXHRpZiAodHJhY2sgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrLmxlbmd0aDsgaSsrKSB7XG5cdFx0dHJhY2tfdmlzLmFkZF90cmFjayAodHJhY2tbaV0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRyYWNrX3Zpcztcblx0fVxuXHR0cmFja3MucHVzaCh0cmFjayk7XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCd0cmFja3MnLCBmdW5jdGlvbiAobmV3X3RyYWNrcykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB0cmFja3Ncblx0fVxuXHR0cmFja3MgPSBuZXdfdHJhY2tzO1xuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgLy8gXG4gICAgYXBpLm1ldGhvZCAoJ3dpZHRoJywgZnVuY3Rpb24gKHcpIHtcblx0Ly8gVE9ETzogQWxsb3cgc3VmZml4ZXMgbGlrZSBcIjEwMDBweFwiP1xuXHQvLyBUT0RPOiBUZXN0IHdyb25nIGZvcm1hdHNcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gd2lkdGg7XG5cdH1cblx0Ly8gQXQgbGVhc3QgbWluLXdpZHRoXG5cdGlmICh3IDwgbWluX3dpZHRoKSB7XG5cdCAgICB3ID0gbWluX3dpZHRoXG5cdH1cblxuXHQvLyBXZSBhcmUgcmVzaXppbmdcblx0aWYgKGRpdl9pZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXHQgICAgLy8gUmVzaXplIHRoZSB6b29taW5nL3Bhbm5pbmcgcGFuZVxuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCkuc3R5bGUoXCJ3aWR0aFwiLCAocGFyc2VJbnQodykgKyBjYXBfd2lkdGgqMikgKyBcInB4XCIpO1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiX3BhbmVcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuXG5cdCAgICAvLyBSZXBsb3Rcblx0ICAgIHdpZHRoID0gdztcblx0ICAgIHBsb3QoKTtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHR0cmFja3NbaV0uZy5zZWxlY3QoXCJyZWN0XCIpLmF0dHIoXCJ3aWR0aFwiLCB3KTtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnJlc2V0LmNhbGwodHJhY2tzW2ldKTtcblx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrc1tpXSx4U2NhbGUpO1xuXHQgICAgfVxuXHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICB3aWR0aCA9IHc7XG5cdH1cblx0XG5cdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCdhbGxvd19kcmFnJywgZnVuY3Rpb24oYikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBkcmFnX2FsbG93ZWQ7XG5cdH1cblx0ZHJhZ19hbGxvd2VkID0gYjtcblx0aWYgKGRyYWdfYWxsb3dlZCkge1xuXHQgICAgLy8gV2hlbiB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgb24gdGhlIG9iamVjdCBiZWZvcmUgc3RhcnRpbmcgdGhlIHNpbXVsYXRpb24sIHdlIGRvbid0IGhhdmUgZGVmaW5lZCB4U2NhbGVcblx0ICAgIGlmICh4U2NhbGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXIueCh4U2NhbGUpXG5cdFx0XHQgICAvLyAueEV4dGVudChbMCwgbGltaXRzLnJpZ2h0XSlcblx0XHRcdCAgIC5zY2FsZUV4dGVudChbKGxvYy50by1sb2MuZnJvbSkvKGxpbWl0cy56b29tX291dC0xKSwgKGxvYy50by1sb2MuZnJvbSkvbGltaXRzLnpvb21faW5dKVxuXHRcdFx0ICAgLm9uKFwiem9vbVwiLCBfbW92ZSkgKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBkdW1teSBzY2FsZSBpbiB4IHRvIGF2b2lkIGRyYWdnaW5nIHRoZSBwcmV2aW91cyBvbmVcblx0ICAgIC8vIFRPRE86IFRoZXJlIG1heSBiZSBhIGNoZWFwZXIgd2F5IG9mIGRvaW5nIHRoaXM/XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngoZDMuc2NhbGUubGluZWFyKCkpLm9uKFwiem9vbVwiLCBudWxsKTtcblx0fVxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgdmFyIF9wbGFjZV90cmFja3MgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBoID0gMDtcblx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgaWYgKHRyYWNrLmcuYXR0cihcInRyYW5zZm9ybVwiKSkge1xuXHRcdHRyYWNrLmdcblx0XHQgICAgLnRyYW5zaXRpb24oKVxuXHRcdCAgICAuZHVyYXRpb24oZHVyKVxuXHRcdCAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH0gZWxzZSB7XG5cdFx0dHJhY2suZ1xuXHRcdCAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgaCArIFwiKVwiKTtcblx0ICAgIH1cblxuXHQgICAgaCArPSB0cmFjay5oZWlnaHQoKTtcblx0fVxuXG5cdC8vIHN2Z1xuXHRzdmcuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cblx0Ly8gZGl2XG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpXG5cdCAgICAuc3R5bGUoXCJoZWlnaHRcIiwgKGggKyAxMCArIGhlaWdodF9vZmZzZXQpICsgXCJweFwiKTtcblxuXHQvLyBjYXBzXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0ICAgIC8vIC5tb3ZlX3RvX2Zyb250KClcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0bW92ZV90b19mcm9udCh0aGlzKTtcblx0ICAgIH0pXG5cdGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcblx0Ly8ubW92ZV90b19mcm9udCgpXG5cdCAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcblx0XHRtb3ZlX3RvX2Zyb250KHRoaXMpO1xuXHQgICAgfSk7XG5cdFxuXG5cdC8vIHBhbmVcblx0cGFuZVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCArIGhlaWdodF9vZmZzZXQpO1xuXG5cdC8vIHRvb1dpZGVfdGV4dC4gVE9ETzogSXMgdGhpcyBzdGlsbCBuZWVkZWQ/XG5cdC8vIHZhciB0b29XaWRlX3RleHQgPSBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfdG9vV2lkZVwiKTtcblx0Ly8gdmFyIGJiID0gdG9vV2lkZV90ZXh0WzBdWzBdLmdldEJCb3goKTtcblx0Ly8gdG9vV2lkZV90ZXh0XG5cdC8vICAgICAuYXR0cihcInlcIiwgfn4oaC8yKSAtIGJiLmhlaWdodC8yKTtcblxuXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH1cblxuICAgIHZhciBfaW5pdF90cmFjayA9IGZ1bmN0aW9uICh0cmFjaykge1xuXHR0cmFjay5nID0gc3ZnLnNlbGVjdChcImdcIikuc2VsZWN0KFwiZ1wiKVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdHJhY2tcIilcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKTtcblxuXHQvLyBSZWN0IGZvciB0aGUgYmFja2dyb3VuZCBjb2xvclxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdCAgICAuYXR0cihcInlcIiwgMClcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgdHJhY2tfdmlzLndpZHRoKCkpXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJub25lXCIpO1xuXG5cdGlmICh0cmFjay5kaXNwbGF5KCkpIHtcblx0ICAgIHRyYWNrLmRpc3BsYXkoKS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcblx0fVxuXHRcblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9O1xuXG4gICAgdmFyIF9tYW51YWxfbW92ZSA9IGZ1bmN0aW9uIChmYWN0b3IsIGRpcmVjdGlvbikge1xuXHR2YXIgb2xkRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXG5cdHZhciBzcGFuID0gb2xkRG9tYWluWzFdIC0gb2xkRG9tYWluWzBdO1xuXHR2YXIgb2Zmc2V0ID0gKHNwYW4gKiBmYWN0b3IpIC0gc3BhbjtcblxuXHR2YXIgbmV3RG9tYWluO1xuXHRzd2l0Y2ggKGRpcmVjdGlvbikge1xuXHRjYXNlIC0xIDpcblx0ICAgIG5ld0RvbWFpbiA9IFsofn5vbGREb21haW5bMF0gLSBvZmZzZXQpLCB+fihvbGREb21haW5bMV0gLSBvZmZzZXQpXTtcblx0ICAgIGJyZWFrO1xuXHRjYXNlIDEgOlxuXHQgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSArIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuXHQgICAgYnJlYWs7XG5cdGNhc2UgMCA6XG5cdCAgICBuZXdEb21haW4gPSBbb2xkRG9tYWluWzBdIC0gfn4ob2Zmc2V0LzIpLCBvbGREb21haW5bMV0gKyAofn5vZmZzZXQvMildO1xuXHR9XG5cblx0dmFyIGludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlTnVtYmVyKG9sZERvbWFpblswXSwgbmV3RG9tYWluWzBdKTtcblx0dmFyIGVhc2UgPSBleHBvcnRzLmVhc2U7XG5cblx0dmFyIHggPSAwO1xuXHRkMy50aW1lcihmdW5jdGlvbigpIHtcblx0ICAgIHZhciBjdXJyX3N0YXJ0ID0gaW50ZXJwb2xhdG9yKGVhc2UoeCkpO1xuXHQgICAgdmFyIGN1cnJfZW5kO1xuXHQgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcblx0ICAgIGNhc2UgLTEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDEgOlxuXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG5cdFx0YnJlYWs7XG5cdCAgICBjYXNlIDAgOlxuXHRcdGN1cnJfZW5kID0gb2xkRG9tYWluWzFdICsgb2xkRG9tYWluWzBdIC0gY3Vycl9zdGFydDtcblx0XHRicmVhaztcblx0ICAgIH1cblxuXHQgICAgdmFyIGN1cnJEb21haW4gPSBbY3Vycl9zdGFydCwgY3Vycl9lbmRdO1xuXHQgICAgeFNjYWxlLmRvbWFpbihjdXJyRG9tYWluKTtcblx0ICAgIF9tb3ZlKHhTY2FsZSk7XG5cdCAgICB4Kz0wLjAyO1xuXHQgICAgcmV0dXJuIHg+MTtcblx0fSk7XG4gICAgfTtcblxuXG4gICAgdmFyIF9tb3ZlX2NiYWsgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjdXJyRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHR0cmFja192aXMuZnJvbSh+fmN1cnJEb21haW5bMF0pO1xuXHR0cmFja192aXMudG8ofn5jdXJyRG9tYWluWzFdKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNrcy5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuXHQgICAgX3VwZGF0ZV90cmFjayh0cmFjaywgbG9jKTtcblx0fVxuICAgIH07XG4gICAgLy8gVGhlIGRlZmVycmVkX2NiYWsgaXMgZGVmZXJyZWQgYXQgbGVhc3QgdGhpcyBhbW91bnQgb2YgdGltZSBvciByZS1zY2hlZHVsZWQgaWYgZGVmZXJyZWQgaXMgY2FsbGVkIGJlZm9yZVxuICAgIHZhciBfZGVmZXJyZWQgPSBkZWZlckNhbmNlbChfbW92ZV9jYmFrLCAzMDApO1xuXG4gICAgLy8gYXBpLm1ldGhvZCgndXBkYXRlJywgZnVuY3Rpb24gKCkge1xuICAgIC8vIFx0X21vdmUoKTtcbiAgICAvLyB9KTtcblxuICAgIHZhciBfbW92ZSA9IGZ1bmN0aW9uIChuZXdfeFNjYWxlKSB7XG5cdGlmIChuZXdfeFNjYWxlICE9PSB1bmRlZmluZWQgJiYgZHJhZ19hbGxvd2VkKSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLngobmV3X3hTY2FsZSk7XG5cdH1cblxuXHQvLyBTaG93IHRoZSByZWQgYmFycyBhdCB0aGUgbGltaXRzXG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdGlmIChkb21haW5bMF0gPD0gNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cdGlmIChkb21haW5bMV0gPj0gKGxpbWl0cy5yaWdodCktNSkge1xuXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG5cdFx0LnRyYW5zaXRpb24oKVxuXHRcdC5kdXJhdGlvbigyMDApXG5cdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcblx0fVxuXG5cblx0Ly8gQXZvaWQgbW92aW5nIHBhc3QgdGhlIGxpbWl0c1xuXHRpZiAoZG9tYWluWzBdIDwgbGltaXRzLmxlZnQpIHtcblx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5sZWZ0KSArIHhTY2FsZS5yYW5nZSgpWzBdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG5cdH0gZWxzZSBpZiAoZG9tYWluWzFdID4gbGltaXRzLnJpZ2h0KSB7XG5cdCAgICB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZShbem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVswXSAtIHhTY2FsZShsaW1pdHMucmlnaHQpICsgeFNjYWxlLnJhbmdlKClbMV0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcblx0fVxuXG5cdF9kZWZlcnJlZCgpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG5cdCAgICB0cmFjay5kaXNwbGF5KCkubW92ZS5jYWxsKHRyYWNrLHhTY2FsZSk7XG5cdH1cbiAgICB9O1xuXG4gICAgLy8gYXBpLm1ldGhvZCh7XG4gICAgLy8gXHRhbGxvd19kcmFnIDogYXBpX2FsbG93X2RyYWcsXG4gICAgLy8gXHR3aWR0aCAgICAgIDogYXBpX3dpZHRoLFxuICAgIC8vIFx0YWRkX3RyYWNrICA6IGFwaV9hZGRfdHJhY2ssXG4gICAgLy8gXHRyZW9yZGVyICAgIDogYXBpX3Jlb3JkZXIsXG4gICAgLy8gXHR6b29tICAgICAgIDogYXBpX3pvb20sXG4gICAgLy8gXHRsZWZ0ICAgICAgIDogYXBpX2xlZnQsXG4gICAgLy8gXHRyaWdodCAgICAgIDogYXBpX3JpZ2h0LFxuICAgIC8vIFx0c3RhcnQgICAgICA6IGFwaV9zdGFydFxuICAgIC8vIH0pO1xuXG4gICAgLy8gQXV4aWxpYXIgZnVuY3Rpb25zXG4gICAgZnVuY3Rpb24gbW92ZV90b19mcm9udCAoZWxlbSkge1xuXHRlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0cmFja192aXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbi8vIHZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xuXG52YXIgZGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBfID0gZnVuY3Rpb24gKCkge1xuICAgIH07XG5cbiAgICAvLyBHZXR0ZXJzIC8gU2V0dGVyc1xuICAgIGFwaWpzIChfKVxuXHQuZ2V0c2V0ICgnbGFiZWwnLCBcIlwiKVxuXHQuZ2V0c2V0ICgnZWxlbWVudHMnLCBbXSlcblx0LmdldHNldCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHt9KTtcblxuICAgIHJldHVybiBfO1xufTtcblxuLy8gVGhlIHJldHJpZXZlcnMuIFRoZXkgbmVlZCB0byBhY2Nlc3MgJ2VsZW1lbnRzJ1xuZGF0YS5yZXRyaWV2ZXIgPSB7fTtcblxuZGF0YS5yZXRyaWV2ZXIuc3luYyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1cGRhdGVfdHJhY2sgPSBmdW5jdGlvbihvYmopIHtcblx0Ly8gXCJ0aGlzXCIgaXMgc2V0IHRvIHRoZSBkYXRhIG9ialxuICAgICAgICB0aGlzLmVsZW1lbnRzKHVwZGF0ZV90cmFjay5yZXRyaWV2ZXIoKShvYmoubG9jKSk7XG4gICAgICAgIG9iai5vbl9zdWNjZXNzKCk7XG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCdyZXRyaWV2ZXInLCBmdW5jdGlvbiAoKSB7fSlcblxuICAgIHJldHVybiB1cGRhdGVfdHJhY2s7XG59O1xuXG5kYXRhLnJldHJpZXZlci5hc3luYyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdXJsID0gJyc7XG5cbiAgICAvLyBcInRoaXNcIiBpcyBzZXQgdG8gdGhlIGRhdGEgb2JqXG4gICAgdmFyIGRhdGFfb2JqID0gdGhpcztcbiAgICB2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKG9iaikge1xuXHRkMy5qc29uKHVybCwgZnVuY3Rpb24gKGVyciwgcmVzcCkge1xuXHQgICAgZGF0YV9vYmouZWxlbWVudHMocmVzcCk7XG5cdCAgICBvYmoub25fc3VjY2VzcygpO1xuXHR9KTsgXG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCd1cmwnLCAnJyk7XG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxuXG5cbi8vIEEgcHJlZGVmaW5lZCB0cmFjayBmb3IgZ2VuZXNcbi8vIHRudC50cmFjay5kYXRhLmdlbmUgPSBmdW5jdGlvbiAoKSB7XG4vLyAgICAgdmFyIHRyYWNrID0gdG50LnRyYWNrLmRhdGEoKTtcbi8vIFx0Ly8gLmluZGV4KFwiSURcIik7XG5cbi8vICAgICB2YXIgdXBkYXRlciA9IHRudC50cmFjay5yZXRyaWV2ZXIuZW5zZW1ibCgpXG4vLyBcdC5lbmRwb2ludChcInJlZ2lvblwiKVxuLy8gICAgIC8vIFRPRE86IElmIHN1Y2Nlc3MgaXMgZGVmaW5lZCBoZXJlLCBtZWFucyB0aGF0IGl0IGNhbid0IGJlIHVzZXItZGVmaW5lZFxuLy8gICAgIC8vIGlzIHRoYXQgZ29vZD8gZW5vdWdoPyBBUEk/XG4vLyAgICAgLy8gVVBEQVRFOiBOb3cgc3VjY2VzcyBpcyBiYWNrZWQgdXAgYnkgYW4gYXJyYXkuIFN0aWxsIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCBvcHRpb25cbi8vIFx0LnN1Y2Nlc3MoZnVuY3Rpb24oZ2VuZXMpIHtcbi8vIFx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbi8vIFx0XHRpZiAoZ2VuZXNbaV0uc3RyYW5kID09PSAtMSkgeyAgXG4vLyBcdFx0ICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmVzW2ldLmV4dGVybmFsX25hbWU7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHQgICAgZ2VuZXNbaV0uZGlzcGxheV9sYWJlbCA9IGdlbmVzW2ldLmV4dGVybmFsX25hbWUgKyBcIj5cIjtcbi8vIFx0XHR9XG4vLyBcdCAgICB9XG4vLyBcdH0pO1xuXG4vLyAgICAgcmV0dXJuIHRyYWNrLnVwZGF0ZSh1cGRhdGVyKTtcbi8vIH1cblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGRpc3BsYXlpbmcgbm8gZXh0ZXJuYWwgZGF0YVxuLy8gaXQgaXMgdXNlZCBmb3IgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tzIGZvciBleGFtcGxlXG5kYXRhLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0cmFjayA9IGRhdGEoKTtcbiAgICB2YXIgdXBkYXRlciA9IGRhdGEucmV0cmlldmVyLnN5bmMoKTtcbiAgICB0cmFjay51cGRhdGUodXBkYXRlcik7XG5cbiAgICByZXR1cm4gdHJhY2s7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkYXRhO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcblxuLy8gRkVBVFVSRSBWSVNcbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciB0bnRfZmVhdHVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLy8vLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgZXhwb3J0cyA9IHtcblx0Y3JlYXRlICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJjcmVhdGVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwifSxcblx0bW92ZXIgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJtb3ZlX2VsZW0gaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2UgZmVhdHVyZSBvYmplY3RcIn0sXG5cdHVwZGF0ZXIgIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX2NsaWNrIDogZnVuY3Rpb24gKCkge30sXG5cdG9uX21vdXNlb3ZlciA6IGZ1bmN0aW9uICgpIHt9LFxuXHRndWlkZXIgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHRpbmRleCAgICA6IHVuZGVmaW5lZCxcblx0bGF5b3V0ICAgOiBsYXlvdXQuaWRlbnRpdHkoKSxcblx0Zm9yZWdyb3VuZF9jb2xvciA6ICcjMDAwJ1xuICAgIH07XG5cblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3RcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpLnJlbW92ZSgpO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcIi50bnRfZ3VpZGVyXCIpLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRleHBvcnRzLmd1aWRlci5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24gKG5ld19lbGVtcywgdHJhY2ssIHhTY2FsZSkge1xuXHRuZXdfZWxlbXMub24oXCJjbGlja1wiLCBleHBvcnRzLm9uX2NsaWNrKTtcblx0bmV3X2VsZW1zLm9uKFwibW91c2VvdmVyXCIsIGV4cG9ydHMub25fbW91c2VvdmVyKTtcblx0Ly8gbmV3X2VsZW0gaXMgYSBnIGVsZW1lbnQgd2hlcmUgdGhlIGZlYXR1cmUgaXMgaW5zZXJ0ZWRcblx0ZXhwb3J0cy5jcmVhdGUuY2FsbCh0cmFjaywgbmV3X2VsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGxheW91dCA9IGV4cG9ydHMubGF5b3V0O1xuXG5cdHZhciBlbGVtZW50cyA9IHRyYWNrLmRhdGEoKS5lbGVtZW50cygpO1xuXG5cdGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICBlbGVtZW50cyA9IGVsZW1lbnRzW2ZpZWxkXTtcblx0fVxuXG5cdGxheW91dChlbGVtZW50cywgeFNjYWxlKTtcblx0dmFyIGRhdGFfZWxlbXMgPSBsYXlvdXQuZWxlbWVudHMoKTtcblxuXHR2YXIgdmlzX3NlbDtcblx0dmFyIHZpc19lbGVtcztcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuXHR9XG5cblx0aWYgKGV4cG9ydHMuaW5kZXgpIHsgLy8gSW5kZXhpbmcgYnkgZmllbGRcblx0ICAgIHZpc19lbGVtcyA9IHZpc19zZWxcblx0XHQuZGF0YShkYXRhX2VsZW1zLCBmdW5jdGlvbiAoZCkge1xuXHRcdCAgICBpZiAoZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gZXhwb3J0cy5pbmRleChkKTtcblx0XHQgICAgfVxuXHRcdH0pXG5cdH0gZWxzZSB7IC8vIEluZGV4aW5nIGJ5IHBvc2l0aW9uIGluIGFycmF5XG5cdCAgICB2aXNfZWxlbXMgPSB2aXNfc2VsXG5cdFx0LmRhdGEoZGF0YV9lbGVtcylcblx0fVxuXG5cdGV4cG9ydHMudXBkYXRlci5jYWxsKHRyYWNrLCB2aXNfZWxlbXMsIHhTY2FsZSk7XG5cblx0dmFyIG5ld19lbGVtID0gdmlzX2VsZW1zXG5cdCAgICAuZW50ZXIoKTtcblxuXHRuZXdfZWxlbVxuXHQgICAgLmFwcGVuZChcImdcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZWxlbVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbV9cIiArIGZpZWxkLCBmaWVsZClcblx0ICAgIC5jYWxsKGZlYXR1cmUucGxvdCwgdHJhY2ssIHhTY2FsZSk7XG5cblx0dmlzX2VsZW1zXG5cdCAgICAuZXhpdCgpXG5cdCAgICAucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBtb3ZlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0dmFyIGVsZW1zO1xuXHQvLyBUT0RPOiBJcyBzZWxlY3RpbmcgdGhlIGVsZW1lbnRzIHRvIG1vdmUgdG9vIHNsb3c/XG5cdC8vIEl0IHdvdWxkIGJlIG5pY2UgdG8gcHJvZmlsZVxuXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgZWxlbXMgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG5cdH0gZWxzZSB7XG5cdCAgICBlbGVtcyA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbVwiKTtcblx0fVxuXG5cdGV4cG9ydHMubW92ZXIuY2FsbCh0aGlzLCBlbGVtcywgeFNjYWxlKTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdmVfdG9fZnJvbnQgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICB2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHQgICAgc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpLm1vdmVfdG9fZnJvbnQoKTtcblx0fVxuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZSlcblx0LmdldHNldCAoZXhwb3J0cylcblx0Lm1ldGhvZCAoe1xuXHQgICAgcmVzZXQgIDogcmVzZXQsXG5cdCAgICBwbG90ICAgOiBwbG90LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBtb3ZlX3RvX2Zyb250IDogbW92ZV90b19mcm9udFxuXHR9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuY29tcG9zaXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaXNwbGF5cyA9IHt9O1xuICAgIHZhciBkaXNwbGF5X29yZGVyID0gW107XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB7fTtcblxuICAgIHZhciByZXNldCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBkaXNwbGF5c1tpXS5yZXNldC5jYWxsKHRyYWNrKTtcblx0fVxuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuIFx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0uaW5pdC5jYWxsKHRyYWNrLCB3aWR0aCk7XG5cdCAgICB9XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uICh4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXlfb3JkZXJbaV0pO1xuXHQgICAgZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0ubW92ZV90b19mcm9udC5jYWxsKHRyYWNrLCBkaXNwbGF5X29yZGVyW2ldKTtcblx0fVxuXHQvLyBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG5cdC8vICAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcblx0Ly8gXHRkaXNwbGF5c1tkaXNwbGF5XS51cGRhdGUuY2FsbCh0cmFjaywgeFNjYWxlLCBkaXNwbGF5KTtcblx0Ly8gICAgIH1cblx0Ly8gfVxuICAgIH07XG5cbiAgICB2YXIgbW92ZSA9IGZ1bmN0aW9uICh4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuXHQgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG5cdFx0ZGlzcGxheXNbZGlzcGxheV0ubW92ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXkpO1xuXHQgICAgfVxuXHR9XG4gICAgfTtcblxuICAgIHZhciBhZGQgPSBmdW5jdGlvbiAoa2V5LCBkaXNwbGF5KSB7XG5cdGRpc3BsYXlzW2tleV0gPSBkaXNwbGF5O1xuXHRkaXNwbGF5X29yZGVyLnB1c2goa2V5KTtcblx0cmV0dXJuIGZlYXR1cmVzO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZXMpXG5cdC5tZXRob2QgKHtcblx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuXHQgICAgbW92ZSAgIDogbW92ZSxcblx0ICAgIGluaXQgICA6IGluaXQsXG5cdCAgICBhZGQgICAgOiBhZGRcblx0fSk7XG5cblxuICAgIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnRudF9mZWF0dXJlLnNlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcblx0Zm9udHNpemUgOiAxMCxcblx0c2VxdWVuY2UgOiBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuc2VxdWVuY2Vcblx0fVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGZlYXR1cmUpXG5cdC5nZXRzZXQgKGNvbmZpZyk7XG5cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X250cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bmV3X250c1xuXHQgICAgLmFwcGVuZChcInRleHRcIilcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIGNvbmZpZy5mb250c2l6ZSArIFwicHhcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUgKGQucG9zKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gfn4odHJhY2suaGVpZ2h0KCkgLyAyKSArIDU7IFxuXHQgICAgfSlcblx0ICAgIC50ZXh0KGNvbmZpZy5zZXF1ZW5jZSlcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cignZmlsbCcsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChudHMsIHhTY2FsZSkge1xuXHRudHMuc2VsZWN0IChcInRleHRcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUoZC5wb3MpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmFyZWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG4gICAgdmFyIGxpbmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG5cbiAgICB2YXIgYXJlYSA9IGQzLnN2Zy5hcmVhKClcblx0LmludGVycG9sYXRlKGxpbmUuaW50ZXJwb2xhdGUoKSlcblx0LnRlbnNpb24oZmVhdHVyZS50ZW5zaW9uKCkpO1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgdmFyIGxpbmVfY3JlYXRlID0gZmVhdHVyZS5jcmVhdGUoKTsgLy8gV2UgJ3NhdmUnIGxpbmUgY3JlYXRpb25cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKHBvaW50cywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0aWYgKGRhdGFfcG9pbnRzICE9PSB1bmRlZmluZWQpIHtcbi8vXHQgICAgIHJldHVybjtcblx0ICAgIHRyYWNrLmcuc2VsZWN0KFwicGF0aFwiKS5yZW1vdmUoKTtcblx0fVxuXG5cdGxpbmVfY3JlYXRlLmNhbGwodHJhY2ssIHBvaW50cywgeFNjYWxlKTtcblxuXHRhcmVhXG5cdCAgICAueChsaW5lLngoKSlcblx0ICAgIC55MShsaW5lLnkoKSlcblx0ICAgIC55MCh0cmFjay5oZWlnaHQoKSk7XG5cblx0ZGF0YV9wb2ludHMgPSBwb2ludHMuZGF0YSgpO1xuXHRwb2ludHMucmVtb3ZlKCk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfYXJlYVwiKVxuXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbVwiLCB0cnVlKVxuXHQgICAgLmRhdHVtKGRhdGFfcG9pbnRzKVxuXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKS5icmlnaHRlcigpKTtcblx0XG4gICAgfSk7XG5cbiAgICB2YXIgbGluZV9tb3ZlciA9IGZlYXR1cmUubW92ZXIoKTtcbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGxpbmVfbW92ZXIuY2FsbCh0cmFjaywgcGF0aCwgeFNjYWxlKTtcblxuXHRhcmVhLngobGluZS54KCkpO1xuXHR0cmFjay5nXG5cdCAgICAuc2VsZWN0KFwiLnRudF9hcmVhXCIpXG5cdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG5cdCAgICAuYXR0cihcImRcIiwgYXJlYSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcblxufTtcblxudG50X2ZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgeCA9IGZ1bmN0aW9uIChkKSB7XG5cdHJldHVybiBkLnBvcztcbiAgICB9O1xuICAgIHZhciB5ID0gZnVuY3Rpb24gKGQpIHtcblx0cmV0dXJuIGQudmFsO1xuICAgIH07XG4gICAgdmFyIHRlbnNpb24gPSAwLjc7XG4gICAgdmFyIHlTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpO1xuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHQuaW50ZXJwb2xhdGUoXCJiYXNpc1wiKTtcblxuICAgIC8vIGxpbmUgZ2V0dGVyLiBUT0RPOiBTZXR0ZXI/XG4gICAgZmVhdHVyZS5saW5lID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gbGluZTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS54ID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4geDtcblx0fVxuXHR4ID0gY2Jhaztcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueSA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHk7XG5cdH1cblx0eSA9IGNiYWs7XG5cdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnRlbnNpb24gPSBmdW5jdGlvbiAodCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB0ZW5zaW9uO1xuXHR9XG5cdHRlbnNpb24gPSB0O1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgLy8gRm9yIG5vdywgY3JlYXRlIGlzIGEgb25lLW9mZiBldmVudFxuICAgIC8vIFRPRE86IE1ha2UgaXQgd29yayB3aXRoIHBhcnRpYWwgcGF0aHMsIGllLiBjcmVhdGluZyBhbmQgZGlzcGxheWluZyBvbmx5IHRoZSBwYXRoIHRoYXQgaXMgYmVpbmcgZGlzcGxheWVkXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChwb2ludHMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdGlmIChkYXRhX3BvaW50cyAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAvLyByZXR1cm47XG5cdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG5cdH1cblxuXHRsaW5lXG5cdCAgICAudGVuc2lvbih0ZW5zaW9uKVxuXHQgICAgLngoZnVuY3Rpb24gKGQpIHtyZXR1cm4geFNjYWxlKHgoZCkpfSlcblx0ICAgIC55KGZ1bmN0aW9uIChkKSB7cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKHkoZCkpfSlcblxuXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG5cdHBvaW50cy5yZW1vdmUoKTtcblxuXHR5U2NhbGVcblx0ICAgIC5kb21haW4oWzAsIDFdKVxuXHQgICAgLy8gLmRvbWFpbihbMCwgZDMubWF4KGRhdGFfcG9pbnRzLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgLy8gXHRyZXR1cm4geShkKTtcblx0ICAgIC8vIH0pXSlcblx0ICAgIC5yYW5nZShbMCwgdHJhY2suaGVpZ2h0KCkgLSAyXSk7XG5cdFxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwicGF0aFwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9lbGVtXCIpXG5cdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgNClcblx0ICAgIC5zdHlsZShcImZpbGxcIiwgXCJub25lXCIpO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cblx0bGluZS54KGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4geFNjYWxlKHgoZCkpXG5cdH0pO1xuXHR0cmFjay5nLnNlbGVjdChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiZFwiLCBsaW5lKGRhdGFfcG9pbnRzKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmNvbnNlcnZhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlLmFyZWFcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlLmFyZWEoKTtcblxuICAgIHZhciBhcmVhX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBhcmVhIGNyZWF0aW9uXG4gICAgZmVhdHVyZS5jcmVhdGUgIChmdW5jdGlvbiAocG9pbnRzLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRhcmVhX2NyZWF0ZS5jYWxsKHRyYWNrLCBkMy5zZWxlY3QocG9pbnRzWzBdWzBdKSwgeFNjYWxlKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5lbnNlbWJsID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGJvYXJkLnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjIgPSBcIiM3RkZGMDBcIjtcbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjMgPSBcIiMwMEJCMDBcIjtcblxuICAgIGZlYXR1cmUuZ3VpZGVyIChmdW5jdGlvbiAod2lkdGgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAuOCkpIC8gMjtcblxuXHR0cmFjay5nXG5cdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ndWlkZXJcIilcblx0ICAgIC5hdHRyKFwieDFcIiwgMClcblx0ICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG5cdCAgICAuYXR0cihcInkxXCIsIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuYXR0cihcInkyXCIsIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcImxpbmVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ3VpZGVyXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIDApXG5cdCAgICAuYXR0cihcIngyXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJ5MVwiLCB0cmFjay5oZWlnaHQoKSAtIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcblx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSlcblx0ICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG5cdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogLjgpKSAvIDI7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZSAoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGhlaWdodF9vZmZzZXQpXG4vLyBcdCAgICAuYXR0cihcInJ4XCIsIDMpXG4vLyBcdCAgICAuYXR0cihcInJ5XCIsIDMpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSAtIH5+KGhlaWdodF9vZmZzZXQgKiAyKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7IFxuXHRcdGlmIChkLnR5cGUgPT09ICdoaWdoJykge1xuXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblx0XHR9XG5cdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcblx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMoKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlciAoZnVuY3Rpb24gKGJsb2NrcywgeFNjYWxlKSB7XG5cdGJsb2Nrc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpXG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IyID0gZnVuY3Rpb24gKGNvbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBmb3JlZ3JvdW5kX2NvbG9yMjtcblx0fVxuXHRmb3JlZ3JvdW5kX2NvbG9yMiA9IGNvbDtcblx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGZvcmVncm91bmRfY29sb3IzO1xuXHR9XG5cdGZvcmVncm91bmRfY29sb3IzID0gY29sO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS52bGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQgKFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdC8vIFRPRE86IFNob3VsZCB1c2UgdGhlIGluZGV4IHZhbHVlP1xuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKVxuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSlcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcInkxXCIsIDApXG5cdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuXHQgICAgLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uICh2bGluZXMsIHhTY2FsZSkge1xuXHR2bGluZXNcblx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgYXBpanMoZmVhdHVyZSlcblx0LmdldHNldCgnZnJvbScsIGZ1bmN0aW9uIChkKSB7XG5cdCAgICByZXR1cm4gZC5zdGFydDtcblx0fSlcblx0LmdldHNldCgndG8nLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuZW5kO1xuXHR9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlKGZ1bmN0aW9uIChuZXdfZWxlbXMsIHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHQvLyBUT0RPOiBzdGFydCwgZW5kIHNob3VsZCBiZSBhZGp1c3RhYmxlIHZpYSB0aGUgdHJhY2tzIEFQSVxuXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuXHRcdHJldHVybiAoeFNjYWxlKGZlYXR1cmUudG8oKShkLCBpKSkgLSB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm4gZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIGQuY29sb3I7XG5cdFx0fVxuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGVsZW1zLCB4U2NhbGUpIHtcblx0ZWxlbXNcblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoYmxvY2tzLCB4U2NhbGUpIHtcblx0YmxvY2tzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmF4aXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhBeGlzO1xuICAgIHZhciBvcmllbnRhdGlvbiA9IFwidG9wXCI7XG5cbiAgICAvLyBBeGlzIGRvZXNuJ3QgaW5oZXJpdCBmcm9tIGZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG5cdHhBeGlzID0gdW5kZWZpbmVkO1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR0cmFjay5nLnNlbGVjdEFsbChcInJlY3RcIikucmVtb3ZlKCk7XG5cdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRpY2tcIikucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHZhciBzdmdfZyA9IHRyYWNrLmc7XG5cdHN2Z19nLmNhbGwoeEF4aXMpO1xuICAgIH1cbiAgICBcbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHQvLyBDcmVhdGUgQXhpcyBpZiBpdCBkb2Vzbid0IGV4aXN0XG5cdGlmICh4QXhpcyA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKClcblx0XHQuc2NhbGUoeFNjYWxlKVxuXHRcdC5vcmllbnQob3JpZW50YXRpb24pO1xuXHR9XG5cblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIHN2Z19nID0gdHJhY2suZztcblx0c3ZnX2cuY2FsbCh4QXhpcyk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUub3JpZW50YXRpb24gPSBmdW5jdGlvbiAocG9zKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIG9yaWVudGF0aW9uO1xuXHR9XG5cdG9yaWVudGF0aW9uID0gcG9zO1xuXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5sb2NhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm93O1xuXG4gICAgdmFyIGZlYXR1cmUgPSB7fTtcbiAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5tb3ZlID0gZnVuY3Rpb24oeFNjYWxlKSB7XG5cdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cdHJvdy5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUudXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSkge1xuXHR2YXIgdHJhY2sgPSB0aGlzO1xuXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXHR2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuXHRpZiAocm93ID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHJvdyA9IHN2Z19nO1xuXHQgICAgcm93XG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG5cdH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUgKFwiLi9ib2FyZC5qc1wiKTtcbmJvYXJkLnRyYWNrID0gcmVxdWlyZSAoXCIuL3RyYWNrXCIpO1xuYm9hcmQudHJhY2suZGF0YSA9IHJlcXVpcmUgKFwiLi9kYXRhLmpzXCIpO1xuYm9hcmQudHJhY2subGF5b3V0ID0gcmVxdWlyZSAoXCIuL2xheW91dC5qc1wiKTtcbmJvYXJkLnRyYWNrLmZlYXR1cmUgPSByZXF1aXJlIChcIi4vZmVhdHVyZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbmxheW91dCA9IHt9O1xuXG5sYXlvdXQuaWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGVsZW1lbnRzO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgbCA9IGZ1bmN0aW9uIChuZXdfZWxlbWVudHMpIHtcblx0ZWxlbWVudHMgPSBuZXdfZWxlbWVudHM7XG4gICAgfVxuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChsKVxuXHQubWV0aG9kICh7XG5cdCAgICBoZWlnaHQgICA6IGZ1bmN0aW9uICgpIHt9LFxuXHQgICAgZWxlbWVudHMgOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIGVsZW1lbnRzO1xuXHQgICAgfVxuXHR9KTtcblxuICAgIHJldHVybiBsO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuLy92YXIgYm9hcmQgPSB7fTtcblxudmFyIHRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHJlYWRfY29uZiA9IHtcblx0Ly8gVW5pcXVlIElEIGZvciB0aGlzIHRyYWNrXG5cdGlkIDogdHJhY2suaWQoKVxuICAgIH07XG5cbiAgICB2YXIgZGlzcGxheTtcblxuICAgIHZhciBjb25mID0ge1xuXHQvLyBmb3JlZ3JvdW5kX2NvbG9yIDogZDMucmdiKCcjMDAwMDAwJyksXG5cdGJhY2tncm91bmRfY29sb3IgOiBkMy5yZ2IoJyNDQ0NDQ0MnKSxcblx0aGVpZ2h0ICAgICAgICAgICA6IDI1MCxcblx0Ly8gZGF0YSBpcyB0aGUgb2JqZWN0IChub3JtYWxseSBhIHRudC50cmFjay5kYXRhIG9iamVjdCkgdXNlZCB0byByZXRyaWV2ZSBhbmQgdXBkYXRlIGRhdGEgZm9yIHRoZSB0cmFja1xuXHRkYXRhICAgICAgICAgICAgIDogdHJhY2suZGF0YS5lbXB0eSgpXG4gICAgfTtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3QgLyBjbG9zdXJlXG4gICAgdmFyIF8gPSBmdW5jdGlvbigpIHtcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChfKVxuXHQuZ2V0c2V0IChjb25mKVxuXHQuZ2V0IChyZWFkX2NvbmYpO1xuXG4gICAgLy8gVE9ETzogVGhpcyBtZWFucyB0aGF0IGhlaWdodCBzaG91bGQgYmUgZGVmaW5lZCBiZWZvcmUgZGlzcGxheVxuICAgIC8vIHdlIHNob3VsZG4ndCByZWx5IG9uIHRoaXNcbiAgICBfLmRpc3BsYXkgPSBmdW5jdGlvbiAobmV3X3Bsb3R0ZXIpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gZGlzcGxheTtcblx0fVxuXHRkaXNwbGF5ID0gbmV3X3Bsb3R0ZXI7XG5cdGlmICh0eXBlb2YgKGRpc3BsYXkpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBkaXNwbGF5LmxheW91dCAmJiBkaXNwbGF5LmxheW91dCgpLmhlaWdodChjb25mLmhlaWdodCk7XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICBmb3IgKHZhciBrZXkgaW4gZGlzcGxheSkge1xuXHRcdGlmIChkaXNwbGF5Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHQgICAgZGlzcGxheVtrZXldLmxheW91dCAmJiBkaXNwbGF5W2tleV0ubGF5b3V0KCkuaGVpZ2h0KGNvbmYuaGVpZ2h0KTtcblx0XHR9XG5cdCAgICB9XG5cdH1cblxuXHRyZXR1cm4gXztcbiAgICB9O1xuXG4gICAgcmV0dXJuIF87XG5cbn07XG5cbnRyYWNrLmlkID0gaXRlcmF0b3IoMSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyYWNrO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0bnRfZW5zZW1ibCA9IHJlcXVpcmUoXCIuL3NyYy9yZXN0LmpzXCIpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyk7XG5cbmZ1bmN0aW9uIFJlcXVlc3RFcnJvcihtZXNzYWdlLCBwcm9wcykge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgZXJyLm5hbWUgPSAnUmVxdWVzdEVycm9yJztcbiAgICB0aGlzLm5hbWUgPSBlcnIubmFtZTtcbiAgICB0aGlzLm1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgfVxuXG4gICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIHRoaXNba10gPSBwcm9wc1trXTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuUmVxdWVzdEVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuUmVxdWVzdEVycm9yLmNyZWF0ZSA9IGZ1bmN0aW9uIChtZXNzYWdlLCByZXEsIHByb3BzKSB7XG4gICAgdmFyIGVyciA9IG5ldyBSZXF1ZXN0RXJyb3IobWVzc2FnZSwgcHJvcHMpO1xuICAgIFJlc3BvbnNlLmNhbGwoZXJyLCByZXEpO1xuICAgIHJldHVybiBlcnI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGksXG4gICAgY2xlYW5VUkwgPSByZXF1aXJlKCcuLi9wbHVnaW5zL2NsZWFudXJsJyksXG4gICAgWEhSID0gcmVxdWlyZSgnLi94aHInKSxcbiAgICBkZWxheSA9IHJlcXVpcmUoJy4vdXRpbHMvZGVsYXknKSxcbiAgICBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKS5jcmVhdGUsXG4gICAgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyksXG4gICAgUmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxuICAgIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyksXG4gICAgb25jZSA9IHJlcXVpcmUoJy4vdXRpbHMvb25jZScpO1xuXG5mdW5jdGlvbiBmYWN0b3J5KGRlZmF1bHRzLCBwbHVnaW5zKSB7XG4gICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCB7fTtcbiAgICBwbHVnaW5zID0gcGx1Z2lucyB8fCBbXTtcblxuICAgIGZ1bmN0aW9uIGh0dHAocmVxLCBjYikge1xuICAgICAgICB2YXIgeGhyLCBwbHVnaW4sIGRvbmUsIGssIHRpbWVvdXRJZDtcblxuICAgICAgICByZXEgPSBuZXcgUmVxdWVzdChleHRlbmQoZGVmYXVsdHMsIHJlcSkpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwbHVnaW4gPSBwbHVnaW5zW2ldO1xuICAgICAgICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHBsdWdpbi5wcm9jZXNzUmVxdWVzdChyZXEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2l2ZSB0aGUgcGx1Z2lucyBhIGNoYW5jZSB0byBjcmVhdGUgdGhlIFhIUiBvYmplY3RcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICBpZiAocGx1Z2luLmNyZWF0ZVhIUikge1xuICAgICAgICAgICAgICAgIHhociA9IHBsdWdpbi5jcmVhdGVYSFIocmVxKTtcbiAgICAgICAgICAgICAgICBicmVhazsgLy8gRmlyc3QgY29tZSwgZmlyc3Qgc2VydmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB4aHIgPSB4aHIgfHwgbmV3IFhIUigpO1xuXG4gICAgICAgIHJlcS54aHIgPSB4aHI7XG5cbiAgICAgICAgLy8gQmVjYXVzZSBYSFIgY2FuIGJlIGFuIFhNTEh0dHBSZXF1ZXN0IG9yIGFuIFhEb21haW5SZXF1ZXN0LCB3ZSBhZGRcbiAgICAgICAgLy8gYG9ucmVhZHlzdGF0ZWNoYW5nZWAsIGBvbmxvYWRgLCBhbmQgYG9uZXJyb3JgIGNhbGxiYWNrcy4gV2UgdXNlIHRoZVxuICAgICAgICAvLyBgb25jZWAgdXRpbCB0byBtYWtlIHN1cmUgdGhhdCBvbmx5IG9uZSBpcyBjYWxsZWQgKGFuZCBpdCdzIG9ubHkgY2FsbGVkXG4gICAgICAgIC8vIG9uZSB0aW1lKS5cbiAgICAgICAgZG9uZSA9IG9uY2UoZGVsYXkoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB4aHIub25sb2FkID0geGhyLm9uZXJyb3IgPSB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0geGhyLm9udGltZW91dCA9IHhoci5vbnByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgIHZhciByZXMgPSBlcnIgJiYgZXJyLmlzSHR0cEVycm9yID8gZXJyIDogbmV3IFJlc3BvbnNlKHJlcSk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzUmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcGx1Z2luLnByb2Nlc3NSZXNwb25zZShyZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXEub25sb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQocmVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIsIHJlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcblxuICAgICAgICAvLyBXaGVuIHRoZSByZXF1ZXN0IGNvbXBsZXRlcywgY29udGludWUuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocmVxLnRpbWVkT3V0KSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChyZXEuYWJvcnRlZCkge1xuICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ1JlcXVlc3QgYWJvcnRlZCcsIHJlcSwge25hbWU6ICdBYm9ydCd9KSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBNYXRoLmZsb29yKHhoci5zdGF0dXMgLyAxMDApO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDQwNCAmJiAhcmVxLmVycm9yT240MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBraW5kO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ0NsaWVudCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZCA9ICdTZXJ2ZXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ0hUVFAnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBtc2cgPSBraW5kICsgJyBFcnJvcjogJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIHNlcnZlciByZXR1cm5lZCBhIHN0YXR1cyBvZiAnICsgeGhyLnN0YXR1cyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIGZvciB0aGUgcmVxdWVzdCBcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm1ldGhvZC50b1VwcGVyQ2FzZSgpICsgJyAnICsgcmVxLnVybCArICdcIic7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IobXNnLCByZXEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYG9ubG9hZGAgaXMgb25seSBjYWxsZWQgb24gc3VjY2VzcyBhbmQsIGluIElFLCB3aWxsIGJlIGNhbGxlZCB3aXRob3V0XG4gICAgICAgIC8vIGB4aHIuc3RhdHVzYCBoYXZpbmcgYmVlbiBzZXQsIHNvIHdlIGRvbid0IGNoZWNrIGl0LlxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkgeyBkb25lKCk7IH07XG5cbiAgICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdJbnRlcm5hbCBYSFIgRXJyb3InLCByZXEpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJRSBzb21ldGltZXMgZmFpbHMgaWYgeW91IGRvbid0IHNwZWNpZnkgZXZlcnkgaGFuZGxlci5cbiAgICAgICAgLy8gU2VlIGh0dHA6Ly9zb2NpYWwubXNkbi5taWNyb3NvZnQuY29tL0ZvcnVtcy9pZS9lbi1VUy8zMGVmM2FkZC03NjdjLTQ0MzYtYjhhOS1mMWNhMTliNDgxMmUvaWU5LXJ0bS14ZG9tYWlucmVxdWVzdC1pc3N1ZWQtcmVxdWVzdHMtbWF5LWFib3J0LWlmLWFsbC1ldmVudC1oYW5kbGVycy1ub3Qtc3BlY2lmaWVkP2ZvcnVtPWlld2ViZGV2ZWxvcG1lbnRcbiAgICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHsgLyogbm9vcCAqLyB9O1xuICAgICAgICB4aHIub25wcm9ncmVzcyA9IGZ1bmN0aW9uICgpIHsgLyogbm9vcCAqLyB9O1xuXG4gICAgICAgIHhoci5vcGVuKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuXG4gICAgICAgIGlmIChyZXEudGltZW91dCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgdXNlIHRoZSBub3JtYWwgWEhSIHRpbWVvdXQgbWVjaGFuaXNtIChgeGhyLnRpbWVvdXRgIGFuZFxuICAgICAgICAgICAgLy8gYHhoci5vbnRpbWVvdXRgKSwgYG9ucmVhZHlzdGF0ZWNoYW5nZWAgd2lsbCBiZSB0cmlnZ2VyZWQgYmVmb3JlXG4gICAgICAgICAgICAvLyBgb250aW1lb3V0YC4gVGhlcmUncyBubyB3YXkgdG8gcmVjb2duaXplIHRoYXQgaXQgd2FzIHRyaWdnZXJlZCBieVxuICAgICAgICAgICAgLy8gYSB0aW1lb3V0LCBhbmQgd2UnZCBiZSB1bmFibGUgdG8gZGlzcGF0Y2ggdGhlIHJpZ2h0IGVycm9yLlxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVxLnRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdSZXF1ZXN0IHRpbWVvdXQnLCByZXEsIHtuYW1lOiAnVGltZW91dCd9KSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgeGhyLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7fVxuICAgICAgICAgICAgfSwgcmVxLnRpbWVvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChrIGluIHJlcS5oZWFkZXJzKSB7XG4gICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrLCByZXEuaGVhZGVyc1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB4aHIuc2VuZChyZXEuYm9keSk7XG5cbiAgICAgICAgcmV0dXJuIHJlcTtcbiAgICB9XG5cbiAgICB2YXIgbWV0aG9kLFxuICAgICAgICBtZXRob2RzID0gWydnZXQnLCAncG9zdCcsICdwdXQnLCAnaGVhZCcsICdwYXRjaCcsICdkZWxldGUnXSxcbiAgICAgICAgdmVyYiA9IGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAocmVxLCBjYikge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBSZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICAgICAgcmVxLm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaHR0cChyZXEsIGNiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgZm9yIChpID0gMDsgaSA8IG1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kc1tpXTtcbiAgICAgICAgaHR0cFttZXRob2RdID0gdmVyYihtZXRob2QpO1xuICAgIH1cblxuICAgIGh0dHAucGx1Z2lucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgfTtcblxuICAgIGh0dHAuZGVmYXVsdHMgPSBmdW5jdGlvbiAobmV3VmFsdWVzKSB7XG4gICAgICAgIGlmIChuZXdWYWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5KGV4dGVuZChkZWZhdWx0cywgbmV3VmFsdWVzKSwgcGx1Z2lucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH07XG5cbiAgICBodHRwLnVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5ld1BsdWdpbnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICByZXR1cm4gZmFjdG9yeShkZWZhdWx0cywgcGx1Z2lucy5jb25jYXQobmV3UGx1Z2lucykpO1xuICAgIH07XG5cbiAgICBodHRwLmJhcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWN0b3J5KCk7XG4gICAgfTtcblxuICAgIGh0dHAuUmVxdWVzdCA9IFJlcXVlc3Q7XG4gICAgaHR0cC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4gICAgcmV0dXJuIGh0dHA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh7fSwgW2NsZWFuVVJMXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJlcXVlc3Qob3B0c09yVXJsKSB7XG4gICAgdmFyIG9wdHMgPSB0eXBlb2Ygb3B0c09yVXJsID09PSAnc3RyaW5nJyA/IHt1cmw6IG9wdHNPclVybH0gOiBvcHRzT3JVcmwgfHwge307XG4gICAgdGhpcy5tZXRob2QgPSBvcHRzLm1ldGhvZCA/IG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCkgOiAnR0VUJztcbiAgICB0aGlzLnVybCA9IG9wdHMudXJsO1xuICAgIHRoaXMuaGVhZGVycyA9IG9wdHMuaGVhZGVycyB8fCB7fTtcbiAgICB0aGlzLmJvZHkgPSBvcHRzLmJvZHk7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0cy50aW1lb3V0IHx8IDA7XG4gICAgdGhpcy5lcnJvck9uNDA0ID0gb3B0cy5lcnJvck9uNDA0ICE9IG51bGwgPyBvcHRzLmVycm9yT240MDQgOiB0cnVlO1xuICAgIHRoaXMub25sb2FkID0gb3B0cy5vbmxvYWQ7XG4gICAgdGhpcy5vbmVycm9yID0gb3B0cy5vbmVycm9yO1xufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5hYm9ydGVkKSByZXR1cm47XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICB0aGlzLnhoci5hYm9ydCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuaGVhZGVyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGs7XG4gICAgZm9yIChrIGluIHRoaXMuaGVhZGVycykge1xuICAgICAgICBpZiAodGhpcy5oZWFkZXJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBpZiAobmFtZS50b0xvd2VyQ2FzZSgpID09PSBrLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oZWFkZXJzW2tdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmhlYWRlcnNba107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzW25hbWVdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKTtcblxuXG5mdW5jdGlvbiBSZXNwb25zZShyZXEpIHtcbiAgICB2YXIgaSwgbGluZXMsIG0sXG4gICAgICAgIHhociA9IHJlcS54aHI7XG4gICAgdGhpcy5yZXF1ZXN0ID0gcmVxO1xuICAgIHRoaXMueGhyID0geGhyO1xuICAgIHRoaXMuaGVhZGVycyA9IHt9O1xuXG4gICAgLy8gQnJvd3NlcnMgZG9uJ3QgbGlrZSB5b3UgdHJ5aW5nIHRvIHJlYWQgWEhSIHByb3BlcnRpZXMgd2hlbiB5b3UgYWJvcnQgdGhlXG4gICAgLy8gcmVxdWVzdCwgc28gd2UgZG9uJ3QuXG4gICAgaWYgKHJlcS5hYm9ydGVkIHx8IHJlcS50aW1lZE91dCkgcmV0dXJuO1xuXG4gICAgdGhpcy5zdGF0dXMgPSB4aHIuc3RhdHVzIHx8IDA7XG4gICAgdGhpcy50ZXh0ID0geGhyLnJlc3BvbnNlVGV4dDtcbiAgICB0aGlzLmJvZHkgPSB4aHIucmVzcG9uc2UgfHwgeGhyLnJlc3BvbnNlVGV4dDtcbiAgICB0aGlzLmNvbnRlbnRUeXBlID0geGhyLmNvbnRlbnRUeXBlIHx8ICh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIgJiYgeGhyLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKSk7XG5cbiAgICBpZiAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycykge1xuICAgICAgICBsaW5lcyA9IHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKChtID0gbGluZXNbaV0ubWF0Y2goL1xccyooW15cXHNdKyk6XFxzKyhbXlxcc10rKS8pKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhZGVyc1ttWzFdXSA9IG1bMl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzSHR0cEVycm9yID0gdGhpcy5zdGF0dXMgPj0gNDAwO1xufVxuXG5SZXNwb25zZS5wcm90b3R5cGUuaGVhZGVyID0gUmVxdWVzdC5wcm90b3R5cGUuaGVhZGVyO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFdyYXAgYSBmdW5jdGlvbiBpbiBhIGBzZXRUaW1lb3V0YCBjYWxsLiBUaGlzIGlzIHVzZWQgdG8gZ3VhcmFudGVlIGFzeW5jXG4vLyBiZWhhdmlvciwgd2hpY2ggY2FuIGF2b2lkIHVuZXhwZWN0ZWQgZXJyb3JzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhclxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCksXG4gICAgICAgICAgICBuZXdGdW5jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIHNldFRpbWVvdXQobmV3RnVuYywgMCk7XG4gICAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEEgXCJvbmNlXCIgdXRpbGl0eS5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHJlc3VsdCwgY2FsbGVkID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjYWxsZWQpIHtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgIHJlcS51cmwgPSByZXEudXJsLnJlcGxhY2UoL1teJV0rL2csIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJKHMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuIiwidmFyIGh0dHAgPSByZXF1aXJlKFwiaHR0cHBsZWFzZVwiKTtcbnZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xuXG50bnRfZVJlc3QgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIFByZWZpeGVzIHRvIHVzZSB0aGUgUkVTVCBBUEkuXG4gICAgLy8gVGhlc2UgYXJlIG1vZGlmaWVkIGluIHRoZSBsb2NhbFJFU1Qgc2V0dGVyXG4gICAgdmFyIHByZWZpeCA9IFwiaHR0cDovL3Jlc3QuZW5zZW1ibC5vcmdcIjtcbiAgICB2YXIgcHJlZml4X3JlZ2lvbiA9IHByZWZpeCArIFwiL292ZXJsYXAvcmVnaW9uL1wiO1xuICAgIHZhciBwcmVmaXhfZW5zZ2VuZSA9IHByZWZpeCArIFwiL2xvb2t1cC9pZC9cIjtcbiAgICB2YXIgcHJlZml4X3hyZWYgPSBwcmVmaXggKyBcIi94cmVmcy9zeW1ib2wvXCI7XG4gICAgdmFyIHByZWZpeF9ob21vbG9ndWVzID0gcHJlZml4ICsgXCIvaG9tb2xvZ3kvaWQvXCI7XG4gICAgdmFyIHByZWZpeF9jaHJfaW5mbyA9IHByZWZpeCArIFwiL2luZm8vYXNzZW1ibHkvXCI7XG4gICAgdmFyIHByZWZpeF9hbG5fcmVnaW9uID0gcHJlZml4ICsgXCIvYWxpZ25tZW50L3JlZ2lvbi9cIjtcbiAgICB2YXIgcHJlZml4X2dlbmVfdHJlZSA9IHByZWZpeCArIFwiL2dlbmV0cmVlL2lkL1wiO1xuICAgIHZhciBwcmVmaXhfYXNzZW1ibHkgPSBwcmVmaXggKyBcIi9pbmZvL2Fzc2VtYmx5L1wiO1xuXG4gICAgLy8gTnVtYmVyIG9mIGNvbm5lY3Rpb25zIG1hZGUgdG8gdGhlIGRhdGFiYXNlXG4gICAgdmFyIGNvbm5lY3Rpb25zID0gMDtcblxuICAgIHZhciBlUmVzdCA9IGZ1bmN0aW9uKCkge1xuICAgIH07XG5cbiAgICAvLyBMaW1pdHMgaW1wb3NlZCBieSB0aGUgZW5zZW1ibCBSRVNUIEFQSVxuICAgIGVSZXN0LmxpbWl0cyA9IHtcblx0cmVnaW9uIDogNTAwMDAwMFxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGVSZXN0KTtcblxuXG4gICAgLyoqIDxzdHJvbmc+bG9jYWxSRVNUPC9zdHJvbmc+IHBvaW50cyB0aGUgcXVlcmllcyB0byBhIGxvY2FsIFJFU1Qgc2VydmljZSB0byBkZWJ1Zy5cblx0VE9ETzogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIHJlbW92ZWQgaW4gXCJwcm9kdWN0aW9uXCJcbiAgICAqL1xuICAgIGFwaS5tZXRob2QgKCdsb2NhbFJFU1QnLCBmdW5jdGlvbigpIHtcblx0cHJlZml4ID0gXCJodHRwOi8vMTI3LjAuMC4xOjMwMDBcIjtcblx0cHJlZml4X3JlZ2lvbiA9IHByZWZpeCArIFwiL292ZXJsYXAvcmVnaW9uL1wiO1xuXHRwcmVmaXhfZW5zZ2VuZSA9IHByZWZpeCArIFwiL2xvb2t1cC9pZC9cIjtcblx0cHJlZml4X3hyZWYgPSBwcmVmaXggKyBcIi94cmVmcy9zeW1ib2wvXCI7XG5cdHByZWZpeF9ob21vbG9ndWVzID0gcHJlZml4ICsgXCIvaG9tb2xvZ3kvaWQvXCI7XG5cblx0cmV0dXJuIGVSZXN0O1xuICAgIH0pO1xuXG4gICAgLyoqIDxzdHJvbmc+Y2FsbDwvc3Ryb25nPiBtYWtlcyBhbiBhc3luY2hyb25vdXMgY2FsbCB0byB0aGUgZW5zZW1ibCBSRVNUIHNlcnZpY2UuXG5cdEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBBIGxpdGVyYWwgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBmaWVsZHM6XG5cdDx1bD5cblx0PGxpPnVybCA9PiBUaGUgcmVzdCBVUkwuIFRoaXMgaXMgcmV0dXJuZWQgYnkge0BsaW5rIGVSZXN0LnVybH08L2xpPlxuXHQ8bGk+c3VjY2VzcyA9PiBBIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBSRVNUIHF1ZXJ5IGlzIHN1Y2Nlc3NmdWwgKGkuZS4gdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBpcyBhIGRlZmluZWQgdmFsdWUgYW5kIG5vIGVycm9yIGhhcyBiZWVuIHJldHVybmVkKTwvbGk+XG5cdDxsaT5lcnJvciA9PiBBIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBSRVNUIHF1ZXJ5IHJldHVybnMgYW4gZXJyb3Jcblx0PC91bD5cbiAgICAqL1xuICAgIGFwaS5tZXRob2QgKCdjYWxsJywgZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdXJsID0gb2JqLnVybDtcblx0dmFyIG9uX3N1Y2Nlc3MgPSBvYmouc3VjY2Vzcztcblx0dmFyIG9uX2Vycm9yICAgPSBvYmouZXJyb3I7XG5cdGNvbm5lY3Rpb25zKys7XG5cdGh0dHAuZ2V0KHtcblx0ICAgIFwidXJsXCIgOiB1cmxcblx0fSwgZnVuY3Rpb24gKGVycm9yLCByZXNwKSB7XG5cdCAgICBpZiAocmVzcCAhPT0gdW5kZWZpbmVkICYmIGVycm9yID09IG51bGwgJiYgb25fc3VjY2VzcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0b25fc3VjY2VzcyhKU09OLnBhcnNlKHJlc3AuYm9keSkpO1xuXHQgICAgfVxuXHQgICAgaWYgKGVycm9yICE9PSBudWxsICYmIG9uX2Vycm9yICE9PSB1bmRlZmluZWQpIHtcblx0XHRvbl9lcnJvcihlcnJvcik7XG5cdCAgICB9XG5cdH0pO1xuXHQvLyBkMy5qc29uICh1cmwsIGZ1bmN0aW9uIChlcnJvciwgcmVzcCkge1xuXHQvLyAgICAgY29ubmVjdGlvbnMtLTtcblx0Ly8gICAgIGlmIChyZXNwICE9PSB1bmRlZmluZWQgJiYgZXJyb3IgPT09IG51bGwgJiYgb25fc3VjY2VzcyAhPT0gdW5kZWZpbmVkKSB7XG5cdC8vIFx0b25fc3VjY2VzcyhyZXNwKTtcblx0Ly8gICAgIH1cblx0Ly8gICAgIGlmIChlcnJvciAhPT0gbnVsbCAmJiBvbl9lcnJvciAhPT0gdW5kZWZpbmVkKSB7XG5cdC8vIFx0b25fZXJyb3IoZXJyb3IpO1xuXHQvLyAgICAgfVxuXHQvLyB9KTtcbiAgICB9KTtcblxuXG4gICAgZVJlc3QudXJsID0ge307XG4gICAgdmFyIHVybF9hcGkgPSBhcGlqcyAoZVJlc3QudXJsKTtcblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPnJlZ2lvbjwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBnZW5lcyBpbmNsdWRlZCBpbiB0aGUgc3BlY2lmaWVkIHJlZ2lvblxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyA6IFRoZSBzcGVjaWVzIHRoZSByZWdpb24gcmVmZXJzIHRvPC9saT5cbjxsaT5jaHIgICAgIDogVGhlIGNociAob3Igc2VxX3JlZ2lvbiBuYW1lKTwvbGk+XG48bGk+ZnJvbSAgICA6IFRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgcmVnaW9uIGluIHRoZSBjaHI8L2xpPlxuPGxpPnRvICAgICAgOiBUaGUgZW5kIHBvc2l0aW9uIG9mIHRoZSByZWdpb24gKGZyb20gPCB0byBhbHdheXMpPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvZmVhdHVyZS9yZWdpb24vaG9tb19zYXBpZW5zLzEzOjMyODg5NjExLTMyOTczODA1Lmpzb24/ZmVhdHVyZT1nZW5lfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5yZWdpb24gKHsgc3BlY2llcyA6IFwiaG9tb19zYXBpZW5zXCIsIGNociA6IFwiMTNcIiwgZnJvbSA6IDMyODg5NjExLCB0byA6IDMyOTczODA1IH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdyZWdpb24nLCBmdW5jdGlvbihvYmopIHtcblx0cmV0dXJuIHByZWZpeF9yZWdpb24gK1xuXHQgICAgb2JqLnNwZWNpZXMgK1xuXHQgICAgXCIvXCIgK1xuXHQgICAgb2JqLmNociArXG5cdCAgICBcIjpcIiArIFxuXHQgICAgb2JqLmZyb20gKyBcblx0ICAgIFwiLVwiICsgb2JqLnRvICsgXG5cdCAgICBcIi5qc29uP2ZlYXR1cmU9Z2VuZVwiO1xuICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5zcGVjaWVzX2dlbmU8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZW5zZW1ibCBnZW5lIGFzc29jaWF0ZWQgd2l0aFxuXHQgICAgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIHNwZWNpZmllZCBzcGVjaWVzLlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyAgIDogVGhlIHNwZWNpZXMgdGhlIHJlZ2lvbiByZWZlcnMgdG88L2xpPlxuPGxpPmdlbmVfbmFtZSA6IFRoZSBuYW1lIG9mIHRoZSBnZW5lPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcveHJlZnMvc3ltYm9sL2h1bWFuL0JSQ0EyLmpzb24/b2JqZWN0X3R5cGU9Z2VuZXxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuc3BlY2llc19nZW5lICh7IHNwZWNpZXMgOiBcImh1bWFuXCIsIGdlbmVfbmFtZSA6IFwiQlJDQTJcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgneHJlZicsIGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuIHByZWZpeF94cmVmICtcblx0ICAgIG9iai5zcGVjaWVzICArXG5cdCAgICBcIi9cIiArXG5cdCAgICBvYmoubmFtZSArXG5cdCAgICBcIi5qc29uP29iamVjdF90eXBlPWdlbmVcIjtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+aG9tb2xvZ3Vlczwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBob21vbG9ndWVzIChvcnRob2xvZ3VlcyArIHBhcmFsb2d1ZXMpIG9mIHRoZSBnaXZlbiBlbnNlbWJsIElELlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+aWQgOiBUaGUgRW5zZW1ibCBJRCBvZiB0aGUgZ2VuZTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL2hvbW9sb2d5L2lkL0VOU0cwMDAwMDEzOTYxOC5qc29uP2Zvcm1hdD1jb25kZW5zZWQ7c2VxdWVuY2U9bm9uZTt0eXBlPWFsbHxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuaG9tb2xvZ3VlcyAoeyBpZCA6IFwiRU5TRzAwMDAwMTM5NjE4XCIgfSksXG4gICAgICAgICAgICAgc3VjY2VzcyA6IGNhbGxiYWNrLFxuICAgICAgICAgICAgIGVycm9yICAgOiBjYWxsYmFja1xuXHQgICApO1xuXHQgKi9cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2hvbW9sb2d1ZXMnLCBmdW5jdGlvbihvYmopIHtcblx0cmV0dXJuIHByZWZpeF9ob21vbG9ndWVzICtcblx0ICAgIG9iai5pZCArIFxuXHQgICAgXCIuanNvbj9mb3JtYXQ9Y29uZGVuc2VkO3NlcXVlbmNlPW5vbmU7dHlwZT1hbGxcIjtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+Z2VuZTwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBlbnNlbWJsIGdlbmUgYXNzb2NpYXRlZCB3aXRoXG5cdCAgICB0aGUgZ2l2ZW4gSURcblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPmlkIDogVGhlIG5hbWUgb2YgdGhlIGdlbmU8L2xpPlxuPC91bD5cbiAgICAgICAgICAgIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHVybCB0byBxdWVyeSB0aGUgRW5zZW1ibCBSRVNUIHNlcnZlci4gRm9yIGFuIGV4YW1wbGUgb2Ygb3V0cHV0IG9mIHRoZXNlIHVybHMgc2VlIHRoZSB7QGxpbmsgaHR0cDovL2JldGEucmVzdC5lbnNlbWJsLm9yZy9sb29rdXAvRU5TRzAwMDAwMTM5NjE4Lmpzb24/Zm9ybWF0PWZ1bGx8RW5zZW1ibCBSRVNUIEFQSSBleGFtcGxlfVxuXHQgICAgQGV4YW1wbGVcbmVSZXN0LmNhbGwgKCB1cmwgICAgIDogZVJlc3QudXJsLmdlbmUgKHsgaWQgOiBcIkVOU0cwMDAwMDEzOTYxOFwiIH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdnZW5lJywgZnVuY3Rpb24ob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfZW5zZ2VuZSArXG5cdCAgICBvYmouaWQgK1xuXHQgICAgXCIuanNvbj9mb3JtYXQ9ZnVsbFwiO1xuICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5jaHJfaW5mbzwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBpbmZvcm1hdGlvbiBhc3NvY2lhdGVkIHdpdGggdGhlIGNocm9tb3NvbWUgKHNlcV9yZWdpb24gaW4gRW5zZW1ibCBub21lbmNsYXR1cmUpLlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyA6IFRoZSBzcGVjaWVzIHRoZSBjaHIgKG9yIHNlcV9yZWdpb24pIGJlbG9uZ3MgdG9cbjxsaT5jaHIgICAgIDogVGhlIG5hbWUgb2YgdGhlIGNociAob3Igc2VxX3JlZ2lvbik8L2xpPlxuPC91bD5cbiAgICAgICAgICAgIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHVybCB0byBxdWVyeSB0aGUgRW5zZW1ibCBSRVNUIHNlcnZlci4gRm9yIGFuIGV4YW1wbGUgb2Ygb3V0cHV0IG9mIHRoZXNlIHVybHMgc2VlIHRoZSB7QGxpbmsgaHR0cDovL2JldGEucmVzdC5lbnNlbWJsLm9yZy9hc3NlbWJseS9pbmZvL2hvbW9fc2FwaWVucy8xMy5qc29uP2Zvcm1hdD1mdWxsfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5jaHJfaW5mbyAoeyBzcGVjaWVzIDogXCJob21vX3NhcGllbnNcIiwgY2hyIDogXCIxM1wiIH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgdXJsX2FwaS5tZXRob2QgKCdjaHJfaW5mbycsIGZ1bmN0aW9uKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X2Nocl9pbmZvICtcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiL1wiICtcblx0ICAgIG9iai5jaHIgK1xuXHQgICAgXCIuanNvbj9mb3JtYXQ9ZnVsbFwiO1xuICAgIH0pO1xuXG5cdC8vIFRPRE86IEZvciBub3csIGl0IG9ubHkgd29ya3Mgd2l0aCBzcGVjaWVzX3NldCBhbmQgbm90IHNwZWNpZXNfc2V0X2dyb3Vwc1xuXHQvLyBTaG91bGQgYmUgZXh0ZW5kZWQgZm9yIHdpZGVyIHVzZVxuICAgIHVybF9hcGkubWV0aG9kICgnYWxuX2Jsb2NrJywgZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgdXJsID0gcHJlZml4X2Fsbl9yZWdpb24gKyBcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiL1wiICtcblx0ICAgIG9iai5jaHIgK1xuXHQgICAgXCI6XCIgK1xuXHQgICAgb2JqLmZyb20gK1xuXHQgICAgXCItXCIgK1xuXHQgICAgb2JqLnRvICtcblx0ICAgIFwiLmpzb24/bWV0aG9kPVwiICtcblx0ICAgIG9iai5tZXRob2Q7XG5cblx0Zm9yICh2YXIgaT0wOyBpPG9iai5zcGVjaWVzX3NldC5sZW5ndGg7IGkrKykge1xuXHQgICAgdXJsICs9IFwiJnNwZWNpZXNfc2V0PVwiICsgb2JqLnNwZWNpZXNfc2V0W2ldO1xuXHR9XG5cblx0cmV0dXJuIHVybDtcbiAgICB9KTtcblxuICAgIHVybF9hcGkubWV0aG9kICgnZ2VuZV90cmVlJywgZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gcHJlZml4X2dlbmVfdHJlZSArXG5cdCAgICBvYmouaWQgKyBcblx0ICAgIFwiLmpzb24/c2VxdWVuY2U9XCIgK1xuXHQgICAgKChvYmouc2VxdWVuY2UgfHwgb2JqLmFsaWduZWQpID8gMSA6IFwibm9uZVwiKSArXG5cdCAgICAob2JqLmFsaWduZWQgPyAnJmFsaWduZWQ9MScgOiAnJyk7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCgnYXNzZW1ibHknLCBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBwcmVmaXhfYXNzZW1ibHkgKyBcblx0ICAgIG9iai5zcGVjaWVzICtcblx0ICAgIFwiLmpzb25cIjtcbiAgICB9KTtcblxuXG4gICAgYXBpLm1ldGhvZCAoJ2Nvbm5lY3Rpb25zJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBjb25uZWN0aW9ucztcbiAgICB9KTtcblxuICAgIHJldHVybiBlUmVzdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9lUmVzdDtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fTtcbi8vIH1cbi8vIHRudC5sZWdlbmQgPSByZXF1aXJlKFwiLi9zcmMvbGVnZW5kLmpzXCIpO1xuXG52YXIgbGVnZW5kID0gcmVxdWlyZShcIi4vc3JjL2xlZ2VuZC5qc1wiKTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGxlZ2VuZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBib2FyZCA9IHJlcXVpcmUgKFwidG50LmJvYXJkXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxudmFyIHRudF9sZWdlbmQgPSBmdW5jdGlvbiAoZGl2KSB7XG5cbiAgICBkMy5zZWxlY3QoZGl2KVxuXHQuYXR0cihcImNsYXNzXCIsIFwidG50X2ZyYW1lZFwiKTtcblxuICAgIHZhciBvcHRzID0ge1xuXHRyb3dfaGVpZ2h0IDogMjAsXG5cdHdpZHRoICAgICAgOiAxNDAsXG5cdGZvbnRzaXplICAgOiAxMlxuICAgIH07XG5cbiAgICB2YXIgaWQgPSBpdGVyYXRvcigxKTtcbiAgICB2YXIgbGVnZW5kX2NvbHMgPSBbXTtcblxuICAgIHZhciBfID0gZnVuY3Rpb24gKCkge1xuXHRmb3IgKHZhciBpPTA7IGk8bGVnZW5kX2NvbHMubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBjb2wgPSBsZWdlbmRfY29sc1tpXTtcblx0ICAgIGNvbC5ib2FyZChjb2wuZGl2KTtcblx0ICAgIGNvbC5ib2FyZC5zdGFydCgpO1xuXHR9XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAoXylcblx0LmdldHNldChvcHRzKTtcblxuICAgIGFwaS5tZXRob2QgKCdhZGRfY29sdW1uJywgZnVuY3Rpb24gKCkge1xuXHR2YXIgZGl2X2lkID0gZDMuc2VsZWN0KGRpdilcblx0ICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJ0YWJsZVwiKVxuXHQgICAgLmF0dHIoXCJpZFwiKTtcblxuXHR2YXIgbmV3X2RpdiA9IGQzLnNlbGVjdChkaXYpXG5cdCAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuYXR0cihcImlkXCIsIGRpdl9pZCArIFwiX1wiICsgaWQoKSlcblx0ICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJ0YWJsZS1jZWxsXCIpO1xuXG5cdHZhciBuZXdfYm9hcmQgPSBib2FyZCgpXG5cdCAgICAucmlnaHQoMilcblx0ICAgIC5mcm9tICgxKVxuXHQgICAgLnRvICgyKVxuXHQgICAgLmFsbG93X2RyYWcgKGZhbHNlKVxuXHQgICAgLnNob3dfZnJhbWUgKGZhbHNlKVxuXHQgICAgLndpZHRoIChvcHRzLndpZHRoKTtcblxuXHRuZXdfYm9hcmQuYWRkX3JvdyA9IG5ld19ib2FyZC5hZGRfdHJhY2s7XG5cblx0bGVnZW5kX2NvbHMucHVzaCAoe1xuXHQgICAgJ2RpdicgOiBuZXdfZGl2Lm5vZGUoKSxcblx0ICAgICdib2FyZCcgOiBuZXdfYm9hcmRcblx0fSk7XG5cblx0cmV0dXJuIG5ld19ib2FyZDtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdoZWFkZXInLCBmdW5jdGlvbiAodGV4dCkge1xuXHR2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKTtcblxuXHRmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKGcsIHhTY2FsZSkge1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblx0ICAgIGdcblx0XHQuYXBwZW5kKFwidGV4dFwiKVxuXHRcdC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpXG5cdFx0LmF0dHIoXCJmb250LXNpemVcIiwgdHJhY2suZm9udHNpemUoKSlcblx0XHQuYXR0cihcInhcIiwgeFNjYWxlKDEpKVxuXHRcdC5hdHRyKFwieVwiLCB+fnRyYWNrLmhlaWdodCgpLzIpXG5cdFx0LmF0dHIoXCJmb250LXdlaWdodFwiLCBcImJvbGRcIilcblx0XHQudGV4dCh0cmFjay50ZXh0KCkpO1xuXHR9KTtcblxuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRpc3BsYXkgKGZlYXR1cmUpO1xuXG5cdHJldHVybiB0cmFjaztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd0ZXh0JywgZnVuY3Rpb24gKCkge1xuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRlcGxveSAoZnVuY3Rpb24gKCkge1xuXHRcdHZhciBnID0gdGhpcztcblx0XHRkMy5zZWxlY3QoZylcblx0XHQgICAgLmFwcGVuZChcInRleHRcIilcblx0XHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdFx0ICAgIC5hdHRyKFwieVwiLCB+fih0cmFjay5oZWlnaHQoKSAvIDIpICsgNClcblx0XHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG5cdFx0ICAgIC5hdHRyKFwiZm9udC1zaXplXCIsIHRyYWNrLmZvbnRzaXplKCkpXG5cdFx0ICAgIC50ZXh0KHRyYWNrLmZlYXR1cmVfdGV4dCgpKTtcblx0ICAgIH0pO1xuXG5cdGFwaWpzICh0cmFjaylcblx0ICAgIC5nZXRzZXQgKCdmZWF0dXJlX3RleHQnLCAnJyk7XG5cdFxuXHRyZXR1cm4gdHJhY2s7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnaGxpbmUnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciB0cmFjayA9IGxlZ2VuZF90cmFjaygpXG5cdCAgICAuZGVwbG95IChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGcgPSB0aGlzO1xuXHRcdGQzLnNlbGVjdChnKVxuXHRcdCAgICAuYXBwZW5kKFwibGluZVwiKVxuXHRcdCAgICAuYXR0cihcIngxXCIsIDApXG5cdFx0ICAgIC5hdHRyKFwieDJcIiwgdHJhY2suZmVhdHVyZV93aWR0aCgpKVxuXHRcdCAgICAuYXR0cihcInkxXCIsIH5+KHRyYWNrLmhlaWdodCgpLzIpKVxuXHRcdCAgICAuYXR0cihcInkyXCIsIH5+KHRyYWNrLmhlaWdodCgpLzIpKVxuXHRcdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAyKVxuXHRcdCAgICAuYXR0cihcInN0cm9rZVwiLCB0cmFjay5jb2xvcigpKTtcblx0ICAgIH0pO1xuXG5cdHJldHVybiB0cmFjaztcblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3ZsaW5lJywgZnVuY3Rpb24gKCkge1xuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRlcGxveSAoZnVuY3Rpb24gKCkge1xuXHRcdHZhciBnID0gdGhpcztcblx0XHRkMy5zZWxlY3QoZylcblx0XHQgICAgLmFwcGVuZChcImxpbmVcIilcblx0XHQgICAgLmF0dHIoXCJzdHJva2VcIiwgdHJhY2suY29sb3IoKSlcblx0XHQgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMilcblx0XHQgICAgLmF0dHIoXCJ4MVwiLCA1KVxuXHRcdCAgICAuYXR0cihcIngyXCIsIDUpXG5cdFx0ICAgIC5hdHRyKFwieTFcIiwgMClcblx0XHQgICAgLmF0dHIoXCJ5MlwiLCB0cmFjay5oZWlnaHQoKSk7XG5cdCAgICB9KTtcblxuXHRyZXR1cm4gdHJhY2s7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnc3F1YXJlJywgZnVuY3Rpb24gKCkge1xuXHR2YXIgdHJhY2sgPSBsZWdlbmRfdHJhY2soKVxuXHQgICAgLmRlcGxveSAoZnVuY3Rpb24gKCkge1xuXHRcdHZhciB3X2ggPSB+fih0cmFjay5oZWlnaHQoKSowLjgpO1xuXHRcdHZhciBnID0gdGhpcztcblx0XHRkMy5zZWxlY3QoZylcblx0XHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0XHQgICAgLmF0dHIoXCJ4XCIsIDApXG5cdFx0ICAgIC5hdHRyKFwieVwiLCB0cmFjay5oZWlnaHQoKSAtIHdfaClcblx0XHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3X2gpXG5cdFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHdfaClcblx0XHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpO1xuXHQgICAgfSk7XG5cblx0cmV0dXJuIHRyYWNrO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2NpcmNsZScsIGZ1bmN0aW9uICgpIHtcblx0dmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcblx0ZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChnLCB4U2NhbGUpIHtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICB2YXIgcmFkID0gfn4odHJhY2suaGVpZ2h0KCkvMik7XG5cdCAgICBnXG5cdFx0LmFwcGVuZChcImNpcmNsZVwiKVxuXHRcdC5hdHRyKFwiY3hcIiwgcmFkKVxuXHRcdC5hdHRyKFwiY3lcIiwgfn4ocmFkLzIpKVxuXHRcdC5hdHRyKFwiclwiLCByYWQtMilcblx0XHQuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IoKSk7XG5cdCAgICBnXG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQuYXR0cihcImZpbGxcIiwgXCJibGFja1wiKVxuXHRcdC5hdHRyKFwiZm9udC1zaXplXCIsIHRyYWNrLmZvbnRzaXplKCkpXG5cdFx0LmF0dHIoXCJ4XCIsIDQwKVxuXHRcdC5hdHRyKFwieVwiLCB+fih0cmFjay5oZWlnaHQoKS8yICsgNCkpXG5cdFx0LnRleHQodHJhY2sudGV4dCgpKTtcblx0fSk7XG5cblx0dmFyIHRyYWNrID0gbGVnZW5kX3RyYWNrKClcblx0ICAgIC5kaXNwbGF5IChmZWF0dXJlKTtcblxuXHRyZXR1cm4gdHJhY2s7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnZ3JhZGllbnQnLCBmdW5jdGlvbiAoKSB7XG5cdHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG5cdGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAoZywgeFNjYWxlKSB7XG5cdCAgICB2YXIgZ3JhZF93aWR0aCA9IDEwMDtcblx0ICAgIHZhciB0cmFjayA9IHRoaXM7XG5cdCAgICB2YXIgZ3JhZGllbnQgPSBnXG5cdFx0LmFwcGVuZChcImxpbmVhckdyYWRpZW50XCIpXG5cdFx0LmF0dHIoXCJ4MVwiLCBcIjAlXCIpXG5cdFx0LmF0dHIoXCJ4MlwiLCBcIjEwMCVcIilcblx0XHQuYXR0cihcInkxXCIsIFwiMCVcIilcblx0XHQuYXR0cihcInkyXCIsIFwiMCVcIilcblx0XHQuYXR0cihcImlkXCIsIGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKSArIFwiX2dyYWRpZW50XCIpO1xuXG5cdCAgICBncmFkaWVudFxuXHRcdC5hcHBlbmQoXCJzdG9wXCIpXG5cdFx0LmF0dHIoXCJvZmZzZXRcIiwgXCIwJVwiKVxuXHRcdC5hdHRyKFwic3RvcC1jb2xvclwiLCB0cmFjay5jb2xvcjEoKSlcblx0XHQuYXR0cihcInN0b3Atb3BhY2l0eVwiLCAxKTtcblxuXHQgICAgZ3JhZGllbnRcblx0XHQuYXBwZW5kKFwic3RvcFwiKVxuXHRcdC5hdHRyKFwib2Zmc2V0XCIsIFwiMTAwJVwiKVxuXHRcdC5hdHRyKFwic3RvcC1jb2xvclwiLCB0cmFjay5jb2xvcjIoKSlcblx0XHQuYXR0cihcInN0b3Atb3BhY2l0eVwiLCAxKTtcblxuXHQgICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcblx0XHQuZG9tYWluKFt0cmFjay5mcm9tKCksIHRyYWNrLnRvKCldKVxuXHRcdC5yYW5nZShbMCxncmFkX3dpZHRoXSk7XG5cdCAgICB2YXIgYXhpcyA9IGQzLnN2Zy5heGlzKCkuc2NhbGUoc2NhbGUpLnRpY2tTaXplKDApLnRpY2tzKDMpO1xuXHQgICAgdmFyIGdyYWRfZyA9IGdcblx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDUsMClcIik7XG5cblx0ICAgIHZhciBheGlzX2cgPSBnXG5cdFx0LmFwcGVuZChcImdcIilcblx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSg1LFwiICsgKHRyYWNrLmhlaWdodCgpLTEwKSArIFwiKVwiKVxuXHRcdC5jYWxsKGF4aXMpO1xuXG5cdCAgICBncmFkX2dcblx0XHQuYXBwZW5kKFwicmVjdFwiKVxuXHRcdC5hdHRyKFwieFwiLCAwKVxuXHRcdC5hdHRyKFwieVwiLCAwKVxuXHRcdC5hdHRyKFwid2lkdGhcIiwgZ3JhZF93aWR0aClcblx0XHQuYXR0cihcImhlaWdodFwiLCB+fih0cmFjay5oZWlnaHQoKS0xMCkpXG5cdFx0LmF0dHIoXCJmaWxsXCIsIFwidXJsKCNcIiArIGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKSArIFwiX2dyYWRpZW50KVwiKTtcblxuXHQgICAgZ3JhZF9nXG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQuYXR0cihcImZpbGxcIiwgXCJibGFja1wiKVxuXHRcdC5hdHRyKFwiZm9udC1zaXplXCIsIHRyYWNrLmZvbnRzaXplKCkpXG5cdFx0LmF0dHIoXCJ4XCIsIDExMClcblx0XHQuYXR0cihcInlcIiwgfn4odHJhY2suaGVpZ2h0KCkvMikpXG5cdFx0LnRleHQodHJhY2sudGV4dCgpKTtcblx0fSk7XG5cblx0Ly8gdGhlIGdlbmVyYWwgdHJhY2tcblx0dmFyIHRyYWNrID0gbGVnZW5kX3RyYWNrKClcblx0ICAgIC5kaXNwbGF5IChmZWF0dXJlKTtcblx0dHJhY2suY29sb3IgPSB1bmRlZmluZWQ7XG5cdHZhciBhcGkgPSBhcGlqcyh0cmFjayk7XG5cdGFwaVxuXHQgICAgLmdldHNldCAoXCJjb2xvcjFcIiwgXCJ5ZWxsb3dcIilcblx0ICAgIC5nZXRzZXQgKFwiY29sb3IyXCIsIFwicmVkXCIpXG5cdCAgICAuZ2V0c2V0IChcImZyb21cIiwgMClcblx0ICAgIC5nZXRzZXQgKFwidG9cIiwgMTAwKVxuXG5cdHJldHVybiB0cmFjaztcbiAgICB9KTtcblxuXG4gICAgYXBpLm1ldGhvZCAoJ3JhbmdlJywgZnVuY3Rpb24gKCkge1xuXHR2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKVxuXHRmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKGcsIHhTY2FsZSkge1xuXHQgICAgdmFyIHRyYWNrID0gdGhpcztcblx0ICAgIHZhciBncmFkX3dpZHRoID0gMTAwO1xuXHQgICAgdmFyIGdyYWRpZW50ID0gZ1xuXHRcdC5hcHBlbmQoXCJsaW5lYXJHcmFkaWVudFwiKVxuXHRcdC5hdHRyKFwieDFcIiwgXCIwJVwiKVxuXHRcdC5hdHRyKFwieDJcIiwgXCIxMDAlXCIpXG5cdFx0LmF0dHIoXCJ5MVwiLCBcIjAlXCIpXG5cdFx0LmF0dHIoXCJ5MlwiLCBcIjAlXCIpXG5cdFx0LmF0dHIoXCJpZFwiLCBkMy5zZWxlY3QoZGl2KS5hdHRyKFwiaWRcIikgKyBcIl9yYW5nZVwiKTtcblx0ICAgIGdyYWRpZW50XG5cdFx0LmFwcGVuZChcInN0b3BcIilcblx0XHQuYXR0cihcIm9mZnNldFwiLCBcIjAlXCIpXG5cdFx0LmF0dHIoXCJzdG9wLWNvbG9yXCIsIHRyYWNrLmNvbG9yMSgpKVxuXHRcdC5hdHRyKFwic3RvcC1vcGFjaXR5XCIsIDEpO1xuXHQgICAgZ3JhZGllbnRcblx0XHQuYXBwZW5kKFwic3RvcFwiKVxuXHRcdC5hdHRyKFwib2Zmc2V0XCIsIFwiMTAwJVwiKVxuXHRcdC5hdHRyKFwic3RvcC1jb2xvclwiLCB0cmFjay5jb2xvcjIoKSlcblx0XHQuYXR0cihcInN0b3Atb3BhY2l0eVwiLCAxKTtcblxuXHQgICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcblx0XHQuZG9tYWluKFt0cmFjay5mcm9tKCksIHRyYWNrLnRvKCldKVxuXHRcdC5yYW5nZShbMCwgZ3JhZF93aWR0aF0pO1xuXG5cdCAgICB2YXIgYnJ1c2ggPSBkMy5zdmcuYnJ1c2goKVxuXHRcdC54KHNjYWxlKVxuXHRcdC5leHRlbnQoW3RyYWNrLmZyb20oKSwgdHJhY2sudG8oKV0pXG5cdFx0Lm9uKFwiYnJ1c2hzdGFydFwiLCBicnVzaHN0YXJ0KVxuXHRcdC5vbihcImJydXNoXCIsIGJydXNobW92ZSlcblx0XHQub24oXCJicnVzaGVuZFwiLCBicnVzaGVuZCk7XG5cblx0ICAgIHZhciBicnVzaGcgPSBnXG5cdFx0LmFwcGVuZChcImdcIilcblx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSg1LDUpXCIpXG5cdFx0LmNhbGwgKGJydXNoKTtcblxuXHQgICAgYnJ1c2hnLnNlbGVjdEFsbChcIi5yZXNpemVcIikuYXBwZW5kKFwibGluZVwiKVxuXHRcdC5hdHRyKFwieDFcIiwgMClcblx0XHQuYXR0cihcInkxXCIsIDApXG5cdFx0LmF0dHIoXCJ4MlwiLCAwKVxuXHRcdC5hdHRyKFwieTJcIiwgKHRyYWNrLmhlaWdodCgpLzIgLSAyKSlcblx0XHQuc3R5bGUoXCJzdHJva2VcIiwgXCJibGFja1wiKVxuXHRcdC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAyKTtcblxuXHQgICAgYnJ1c2hnLnNlbGVjdEFsbChcIi5yZXNpemVcIikuYXBwZW5kKFwicGF0aFwiKVxuXHRcdC5hdHRyKFwiZFwiLCBcIk0wLDBMLTMsLTRMMywtNEwwLDBcIilcblx0XHQuYXR0cihcImZpbGxcIiwgXCJibGFja1wiKTtcblxuXHQgICAgYnJ1c2hnLnNlbGVjdEFsbCAoXCJyZWN0XCIpXG5cdFx0LmNsYXNzZWQoXCJ0bnRfbGVnZW5kX3JhbmdlXCIsIHRydWUpXG5cdFx0LmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkvMiAtIDIpXG5cdFx0LmF0dHIoXCJmaWxsXCIsIFwidXJsKCNcIiArIGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKSArIFwiX3JhbmdlKVwiKTtcblxuXHQgICAgYnJ1c2hnXG5cdFx0LmFwcGVuZChcInJlY3RcIilcblx0XHQuYXR0cihcImNsYXNzXCIsIFwidG50X2xlZ2VuZF9yYW5nZV9wcmVcIilcblx0XHQuYXR0cihcInhcIiwgMClcblx0XHQuYXR0cihcInlcIiwgMClcblx0XHQuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKS8yIC0gMilcblx0XHQuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IxKCkpO1xuXG5cdCAgICBicnVzaGdcblx0XHQuYXBwZW5kKFwicmVjdFwiKVxuXHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbGVnZW5kX3JhbmdlX3Bvc3RcIilcblx0XHQuYXR0cihcInlcIiwgMClcblx0XHQuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKS8yIC0gMilcblx0XHQuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IyKCkpO1xuXG5cdCAgICBicnVzaHN0YXJ0KCk7XG5cdCAgICBicnVzaG1vdmUoKTtcblxuXHQgICAgdmFyIGF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHNjYWxlKS50aWNrU2l6ZSgwKS50aWNrcygzKTtcblx0ICAgIHZhciBheGlzX2cgPSBnXG5cdFx0LmFwcGVuZChcImdcIilcblx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSg1LFwiICsgKHRyYWNrLmhlaWdodCgpLTEwKSArIFwiKVwiKVxuXHRcdC5jYWxsKGF4aXMpO1xuXG5cdCAgICBnXG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQuYXR0cihcImZpbGxcIiwgXCJibGFja1wiKVxuXHRcdC5hdHRyKFwiZm9udC1zaXplXCIsIHRyYWNrLmZvbnRzaXplKCkpXG5cdFx0LmF0dHIoXCJ4XCIsIDExNSlcblx0XHQuYXR0cihcInlcIiwgfn4odHJhY2suaGVpZ2h0KCkvMiArIDMpKVxuXHRcdC50ZXh0KHRyYWNrLnRleHQoKSk7XG5cblx0ICAgIGZ1bmN0aW9uIGJydXNoc3RhcnQgKCkge1xuXHQgICAgfVxuXHQgICAgZnVuY3Rpb24gYnJ1c2htb3ZlICgpIHtcblx0XHRjb25zb2xlLmxvZyhicnVzaC5leHRlbnQoKSk7XG5cdFx0YnJ1c2hnLnNlbGVjdEFsbCAoXCIudG50X2xlZ2VuZF9yZWN0XCIpXG5cdFx0ICAgIC5hdHRyKFwiZmlsbFwiLCBcInVybCgjXCIgKyBkMy5zZWxlY3QoZGl2KS5hdHRyKFwiaWRcIikgKyBcIl9yYW5nZSlcIik7XG5cdFx0YnJ1c2hnLnNlbGVjdEFsbCAoXCIudG50X2xlZ2VuZF9yYW5nZV9wcmVcIilcblx0XHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBzY2FsZShicnVzaC5leHRlbnQoKVswXSktMSlcblx0XHRicnVzaGcuc2VsZWN0QWxsIChcIi50bnRfbGVnZW5kX3JhbmdlX3Bvc3RcIilcblx0XHQgICAgLmF0dHIoXCJ4XCIsIHNjYWxlKGJydXNoLmV4dGVudCgpWzFdKSsxKVxuXHRcdCAgICAuYXR0cihcIndpZHRoXCIsICBncmFkX3dpZHRoIC0gc2NhbGUoYnJ1c2guZXh0ZW50KClbMV0pKTtcblx0XHR0cmFjay5vbl9jaGFuZ2UoKS5jYWxsKGJydXNoKTtcblx0ICAgIH1cblx0ICAgIGZ1bmN0aW9uIGJydXNoZW5kICgpIHtcblx0XHRjb25zb2xlLmxvZyhicnVzaC5leHRlbnQoKSk7XG5cdCAgICB9XG5cblx0fSk7XG5cblx0dmFyIHRyYWNrID0gbGVnZW5kX3RyYWNrKClcblx0ICAgIC5kaXNwbGF5IChmZWF0dXJlKTtcblx0dHJhY2suY29sb3IgPSB1bmRlZmluZWQ7XG5cdHZhciBhcGkgPSBhcGlqcyh0cmFjayk7XG5cdGFwaVxuXHQgICAgLmdldHNldCAoXCJjb2xvcjFcIiwgXCJ5ZWxsb3dcIilcblx0ICAgIC5nZXRzZXQgKFwiY29sb3IyXCIsIFwicmVkXCIpXG5cdCAgICAuZ2V0c2V0IChcImZyb21cIiwgMClcblx0ICAgIC5nZXRzZXQgKFwidG9cIiwgMTAwKVxuXHQgICAgLmdldHNldCAoXCJvbl9jaGFuZ2VcIiwgZnVuY3Rpb24gKCl7fSk7XG5cblx0cmV0dXJuIHRyYWNrO1xuICAgIH0pO1xuXG5cbiAgICBhcGkubWV0aG9kICgnZW1wdHknLCBmdW5jdGlvbiAoY29sb3IsIGRlc2MpIHtcblx0dmFyIHRyYWNrID0gYm9hcmQudHJhY2soKVxuXHQgICAgLmhlaWdodChvcHRzLnJvd19oZWlnaHQpXG5cdCAgICAuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG5cdCAgICAuZGF0YShudWxsKVxuXHQgICAgLmRpc3BsYXkobnVsbCk7XG5cblx0cmV0dXJuIHRyYWNrO1xuICAgIH0pO1xuXG4gICAgdmFyIGxlZ2VuZF90cmFjayA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKCk7XG5cdGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAoZywgeFNjYWxlKSB7XG5cdCAgICB2YXIgdHJhY2sgPSB0aGlzO1xuXHQgICAgLy8gZmVhdHVyZVxuXHQgICAgdmFyIGZlYXR1cmVfZyA9IGdcblx0XHQuYXBwZW5kKFwiZ1wiKTtcblx0ICAgIFxuXHQgICAgdHJhY2suZGVwbG95KCkuY2FsbChmZWF0dXJlX2cubm9kZSgpKTtcblxuXHQgICAgLy8gbGFiZWxcblx0ICAgIGdcblx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHRyYWNrLmZlYXR1cmVfd2lkdGgoKSArIDUpICsgXCIsIDApXCIpXG5cdFx0LmFwcGVuZChcInRleHRcIilcblx0XHQuYXR0cihcImZpbGxcIiwgXCJibGFja1wiKVxuXHRcdC5hdHRyKFwieFwiLCAwKVxuXHRcdC5hdHRyKFwieVwiLCB+fih0cmFjay5oZWlnaHQoKS8yKSArIDQpIC8vIFRPRE86IERvbid0IGhhcmRjb2RlIHRoZSA0XG5cdFx0LmF0dHIoXCJmb250LXNpemVcIiwgdHJhY2suZm9udHNpemUoKSlcblx0XHQudGV4dCh0cmFjay50ZXh0KCkpO1xuXHR9KTtcblxuXHR2YXIgdHJhY2sgPSBib2FyZC50cmFjaygpO1xuXG5cdHZhciBhcGkgPSBhcGlqcyAodHJhY2spXG5cdCAgICAuZ2V0c2V0ICgnY29sb3InLCAnYmxhY2snKVxuXHQgICAgLmdldHNldCAoJ3RleHQnLCAnJylcblx0ICAgIC5nZXRzZXQgKCdoZWlnaHQnLCBvcHRzLnJvd19oZWlnaHQpXG5cdCAgICAuZ2V0c2V0ICgnZm9udHNpemUnLCBvcHRzLmZvbnRzaXplKVxuXHQgICAgLmdldHNldCAoJ2ZlYXR1cmVfd2lkdGgnLCA0MClcblx0ICAgIC5nZXRzZXQgKCdkZXBsb3knLCBmdW5jdGlvbiAoKSB7XG5cdFx0dGhyb3cgKCdkZXBsb3kgaXMgbm90IGRlZmluZWQgaW4gdGhlIGxlZ2VuZCBiYXNlIGNsYXNzJyk7XG5cdCAgICB9KTtcblxuXHR0cmFja1xuXHQgICAgLmhlaWdodCAodHJhY2suaGVpZ2h0KCkpXG5cdCAgICAuYmFja2dyb3VuZF9jb2xvciAoXCJ3aGl0ZVwiKVxuXHQgICAgLmRhdGEgKGJvYXJkLnRyYWNrLmRhdGEoKVxuXHRcdCAgIC51cGRhdGUoXG5cdFx0ICAgICAgIGJvYXJkLnRyYWNrLmRhdGEucmV0cmlldmVyLnN5bmMoKVxuXHRcdFx0ICAgLnJldHJpZXZlciAoZnVuY3Rpb24gKCkge1xuXHRcdFx0ICAgICAgIHJldHVybiBbe31dO1xuXHRcdFx0ICAgfSlcblx0XHQgICAgICAgKVxuXHRcdCAgKVxuXHQgICAgLmRpc3BsYXkgKGZlYXR1cmUpO1xuXG5cdHJldHVybiB0cmFjaztcbiAgICB9O1xuXG4gICAgcmV0dXJuIF87XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfbGVnZW5kO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0b29sdGlwID0gcmVxdWlyZShcIi4vc3JjL3Rvb2x0aXAuanNcIik7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcblxudmFyIHRvb2x0aXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZHJhZyA9IGQzLmJlaGF2aW9yLmRyYWcoKTtcbiAgICB2YXIgdG9vbHRpcF9kaXY7XG5cbiAgICB2YXIgY29uZiA9IHtcblx0YmFja2dyb3VuZF9jb2xvciA6IFwid2hpdGVcIixcblx0Zm9yZWdyb3VuZF9jb2xvciA6IFwiYmxhY2tcIixcblx0cG9zaXRpb24gOiBcInJpZ2h0XCIsXG5cdGFsbG93X2RyYWcgOiB0cnVlLFxuXHRzaG93X2Nsb3NlciA6IHRydWUsXG5cdGZpbGwgOiBmdW5jdGlvbiAoKSB7IHRocm93IFwiZmlsbCBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBvYmplY3RcIjsgfSxcblx0d2lkdGggOiAxODAsXG5cdGlkIDogMVxuICAgIH07XG5cbiAgICB2YXIgdCA9IGZ1bmN0aW9uIChkYXRhLCBldmVudCkge1xuXHRkcmFnXG5cdCAgICAub3JpZ2luKGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIHt4OnBhcnNlSW50KGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcImxlZnRcIikpLFxuXHRcdFx0eTpwYXJzZUludChkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJ0b3BcIikpXG5cdFx0ICAgICAgIH07XG5cdCAgICB9KVxuXHQgICAgLm9uKFwiZHJhZ1wiLCBmdW5jdGlvbigpIHtcblx0XHRpZiAoY29uZi5hbGxvd19kcmFnKSB7XG5cdFx0ICAgIGQzLnNlbGVjdCh0aGlzKVxuXHRcdFx0LnN0eWxlKFwibGVmdFwiLCBkMy5ldmVudC54ICsgXCJweFwiKVxuXHRcdFx0LnN0eWxlKFwidG9wXCIsIGQzLmV2ZW50LnkgKyBcInB4XCIpO1xuXHRcdH1cblx0ICAgIH0pO1xuXG5cdC8vIFRPRE86IFdoeSBkbyB3ZSBuZWVkIHRoZSBkaXYgZWxlbWVudD9cblx0Ly8gSXQgbG9va3MgbGlrZSBpZiB3ZSBhbmNob3IgdGhlIHRvb2x0aXAgaW4gdGhlIFwiYm9keVwiXG5cdC8vIFRoZSB0b29sdGlwIGlzIG5vdCBsb2NhdGVkIGluIHRoZSByaWdodCBwbGFjZSAoYXBwZWFycyBhdCB0aGUgYm90dG9tKVxuXHQvLyBTZWUgY2xpZW50cy90b29sdGlwc190ZXN0Lmh0bWwgZm9yIGFuIGV4YW1wbGVcblx0dmFyIGNvbnRhaW5lckVsZW0gPSBzZWxlY3RBbmNlc3RvciAodGhpcywgXCJkaXZcIik7XG5cdGlmIChjb250YWluZXJFbGVtID09PSB1bmRlZmluZWQpIHtcblx0ICAgIC8vIFdlIHJlcXVpcmUgYSBkaXYgZWxlbWVudCBhdCBzb21lIHBvaW50IHRvIGFuY2hvciB0aGUgdG9vbHRpcFxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0Ly8gQ29udGFpbmVyIGVsZW1lbnQgcG9zaXRpb24gKG5lZWRlZCBmb3IgXCJyZWxhdGl2ZVwiIHBvc2l0aW9uZWQgcGFyZW50cylcblx0dmFyIGVsZW1Qb3MgPSBjb250YWluZXJFbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHR2YXIgZWxlbVRvcCA9IGVsZW1Qb3MudG9wICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3A7XG5cdHZhciBlbGVtTGVmdCA9IGVsZW1Qb3MubGVmdCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdDtcblx0XG5cdHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KGNvbnRhaW5lckVsZW0pXG5cdCAgICAuYXBwZW5kKFwiZGl2XCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3Rvb2x0aXBcIilcblx0ICAgIC5jbGFzc2VkKFwidG50X3Rvb2x0aXBfYWN0aXZlXCIsIHRydWUpICAvLyBUT0RPOiBJcyB0aGlzIG5lZWRlZC91c2VkPz8/XG5cdCAgICAuY2FsbChkcmFnKTtcblxuXHQvLyBwcmV2IHRvb2x0aXBzIHdpdGggdGhlIHNhbWUgaGVhZGVyXG5cdGQzLnNlbGVjdChcIiN0bnRfdG9vbHRpcF9cIiArIGNvbmYuaWQpLnJlbW92ZSgpO1xuXG5cdGlmICgoZDMuZXZlbnQgPT09IG51bGwpICYmIChldmVudCkpIHtcblx0ICAgIGQzLmV2ZW50ID0gZXZlbnQ7XG5cdH1cblx0dmFyIG1vdXNlID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV07XG5cdGQzLmV2ZW50ID0gbnVsbDtcblxuXHR2YXIgb2Zmc2V0ID0gMDtcblx0aWYgKGNvbmYucG9zaXRpb24gPT09IFwibGVmdFwiKSB7XG5cdCAgICBvZmZzZXQgPSBjb25mLndpZHRoO1xuXHR9XG5cdFxuXHR0b29sdGlwX2Rpdi5hdHRyKFwiaWRcIiwgXCJ0bnRfdG9vbHRpcF9cIiArIGNvbmYuaWQpO1xuXHRcblx0Ly8gV2UgcGxhY2UgdGhlIHRvb2x0aXBcblx0dG9vbHRpcF9kaXZcblx0ICAgIC5zdHlsZShcImxlZnRcIiwgKG1vdXNlWzBdIC0gb2Zmc2V0IC0gZWxlbUxlZnQpICsgXCJweFwiKVxuXHQgICAgLnN0eWxlKFwidG9wXCIsIG1vdXNlWzFdIC0gZWxlbVRvcCArIFwicHhcIik7XG5cblx0Ly8gQ2xvc2Vcblx0aWYgKGNvbmYuc2hvd19jbG9zZXIpIHtcblx0ICAgIHRvb2x0aXBfZGl2LmFwcGVuZChcInNwYW5cIilcblx0XHQuc3R5bGUoXCJwb3NpdGlvblwiLCBcImFic29sdXRlXCIpXG5cdFx0LnN0eWxlKFwicmlnaHRcIiwgXCItMTBweFwiKVxuXHRcdC5zdHlsZShcInRvcFwiLCBcIi0xMHB4XCIpXG5cdFx0LmFwcGVuZChcImltZ1wiKVxuXHRcdC5hdHRyKFwic3JjXCIsIHRvb2x0aXAuaW1hZ2VzLmNsb3NlKVxuXHRcdC5hdHRyKFwid2lkdGhcIiwgXCIyMHB4XCIpXG5cdFx0LmF0dHIoXCJoZWlnaHRcIiwgXCIyMHB4XCIpXG5cdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuXHRcdCAgICB0LmNsb3NlKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRjb25mLmZpbGwuY2FsbCh0b29sdGlwX2RpdiwgZGF0YSk7XG5cblx0Ly8gcmV0dXJuIHRoaXMgaGVyZT9cblx0cmV0dXJuIHQ7XG4gICAgfTtcblxuICAgIC8vIGdldHMgdGhlIGZpcnN0IGFuY2VzdG9yIG9mIGVsZW0gaGF2aW5nIHRhZ25hbWUgXCJ0eXBlXCJcbiAgICAvLyBleGFtcGxlIDogdmFyIG15ZGl2ID0gc2VsZWN0QW5jZXN0b3IobXllbGVtLCBcImRpdlwiKTtcbiAgICBmdW5jdGlvbiBzZWxlY3RBbmNlc3RvciAoZWxlbSwgdHlwZSkge1xuXHR0eXBlID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRpZiAoZWxlbS5wYXJlbnROb2RlID09PSBudWxsKSB7XG5cdCAgICBjb25zb2xlLmxvZyhcIk5vIG1vcmUgcGFyZW50c1wiKTtcblx0ICAgIHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblx0dmFyIHRhZ05hbWUgPSBlbGVtLnBhcmVudE5vZGUudGFnTmFtZTtcblxuXHRpZiAoKHRhZ05hbWUgIT09IHVuZGVmaW5lZCkgJiYgKHRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gdHlwZSkpIHtcblx0ICAgIHJldHVybiBlbGVtLnBhcmVudE5vZGU7XG5cdH0gZWxzZSB7XG5cdCAgICByZXR1cm4gc2VsZWN0QW5jZXN0b3IgKGVsZW0ucGFyZW50Tm9kZSwgdHlwZSk7XG5cdH1cbiAgICB9XG4gICAgXG4gICAgdmFyIGFwaSA9IGFwaWpzKHQpXG5cdC5nZXRzZXQoY29uZik7XG4gICAgYXBpLmNoZWNrKCdwb3NpdGlvbicsIGZ1bmN0aW9uICh2YWwpIHtcblx0cmV0dXJuICh2YWwgPT09ICdsZWZ0JykgfHwgKHZhbCA9PT0gJ3JpZ2h0Jyk7XG4gICAgfSwgXCJPbmx5ICdsZWZ0JyBvciAncmlnaHQnIHZhbHVlcyBhcmUgYWxsb3dlZCBmb3IgcG9zaXRpb25cIik7XG5cbiAgICBhcGkubWV0aG9kKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcblx0dG9vbHRpcF9kaXYucmVtb3ZlKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAudGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdGFibGUgdG9vbHRpcHMgYXJlIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcbiAgICBcbiAgICB2YXIgd2lkdGggPSAxODA7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG5cdC8vIFRvb2x0aXAgaGVhZGVyXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC5hdHRyKFwiY29sc3BhblwiLCAyKVxuXHQgICAgLnRleHQob2JqLmhlYWRlcik7XG5cblx0Ly8gVG9vbHRpcCByb3dzXG5cdHZhciB0YWJsZV9yb3dzID0gb2JqX2luZm9fdGFibGUuc2VsZWN0QWxsKFwiLnRudF96bWVudV9yb3dcIilcblx0ICAgIC5kYXRhKG9iai5yb3dzKVxuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIik7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRoXCIpXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0ubGFiZWw7XG5cdCAgICB9KTtcblxuXHR0YWJsZV9yb3dzXG5cdCAgICAuYXBwZW5kKFwidGRcIilcblx0ICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuXHRcdHJldHVybiBvYmoucm93c1tpXS52YWx1ZTtcblx0ICAgIH0pXG5cdCAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuXHRcdGlmIChkLmxpbmsgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm47XG5cdFx0fVxuXHRcdGQzLnNlbGVjdCh0aGlzKVxuXHRcdCAgICAuY2xhc3NlZChcImxpbmtcIiwgMSlcblx0XHQgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG5cdFx0XHRkLmxpbmsoZC5vYmopO1xuXHRcdFx0dC5jbG9zZS5jYWxsKHRoaXMpO1xuXHRcdCAgICB9KTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnBsYWluID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHBsYWluIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG5cdCAgICAuYXBwZW5kKFwidGhcIilcblx0ICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuXG5cdG9ial9pbmZvX3RhYmxlXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpXG5cdCAgICAuYXBwZW5kKFwidGRcIilcblx0ICAgIC5zdHlsZShcInRleHQtYWxpZ25cIiwgXCJjZW50ZXJcIilcblx0ICAgIC5odG1sKG9iai5ib2R5KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxuLy8gVE9ETzogVGhpcyBzaG91bGRuJ3QgYmUgZXhwb3NlZCBpbiB0aGUgQVBJLiBJdCB3b3VsZCBiZSBiZXR0ZXIgdG8gaGF2ZSBhcyBhIGxvY2FsIHZhcmlhYmxlXG4vLyBvciBhbHRlcm5hdGl2ZWx5IGhhdmUgdGhlIGltYWdlcyBzb21ld2hlcmUgZWxzZSAoYWx0aG91Z2ggdGhlIG51bWJlciBvZiBoYXJkY29kZWQgaW1hZ2VzIHNob3VsZCBiZSBsZWZ0IGF0IGEgbWluaW11bSlcbnRvb2x0aXAuaW1hZ2VzID0ge307XG50b29sdGlwLmltYWdlcy5jbG9zZSA9ICdkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQVFBQUFBRUFDQVlBQUFCY2NxaG1BQUFLUTJsRFExQkpRME1nY0hKdlptbHNaUUFBZU5xZFUzZFlrL2NXUHQvM1pROVdRdGp3c1pkc2dRQWlJNndJeUJCWm9oQ1NBR0dFRUJKQXhZV0lDbFlVRlJHY1NGWEVndFVLU0oySTRxQW91R2RCaW9oYWkxVmNPTzRmM0tlMWZYcnY3ZTM3MS91ODU1em4vTTU1encrQUVSSW1rZWFpYWdBNVVvVThPdGdmajA5SXhNbTlnQUlWU09BRUlCRG15OEpuQmNVQUFQQURlWGgrZExBLy9BR3Zid0FDQUhEVkxpUVN4K0gvZzdwUUpsY0FJSkVBNENJUzV3c0JrRklBeUM1VXlCUUF5QmdBc0ZPelpBb0FsQUFBYkhsOFFpSUFxZzBBN1BSSlBnVUEyS21UM0JjQTJLSWNxUWdBalFFQW1TaEhKQUpBdXdCZ1ZZRlNMQUxBd2dDZ3JFQWlMZ1RBcmdHQVdiWXlSd0tBdlFVQWRvNVlrQTlBWUFDQW1VSXN6QUFnT0FJQVF4NFR6UU1nVEFPZ01OSy80S2xmY0lXNFNBRUF3TXVWelpkTDBqTVV1SlhRR25meThPRGlJZUxDYkxGQ1lSY3BFR1lKNUNLY2w1c2pFMGpuQTB6T0RBQUFHdm5Sd2Y0NFA1RG41dVRoNW1ibmJPLzB4YUwrYS9CdklqNGg4ZC8rdkl3Q0JBQVFUcy92MmwvbDVkWURjTWNCc0hXL2E2bGJBTnBXQUdqZitWMHoyd21nV2dyUWV2bUxlVGo4UUI2ZW9WRElQQjBjQ2dzTDdTVmlvYjB3NDRzKy96UGhiK0NMZnZiOFFCNysyM3J3QUhHYVFKbXR3S09EL1hGaGJuYXVVbzdueXdSQ01XNzM1eVAreDRWLy9ZNHAwZUkwc1Z3c0ZZcnhXSW00VUNKTngzbTVVcEZFSWNtVjRoTHBmekx4SDViOUNaTjNEUUNzaGsvQVRyWUh0Y3Rzd0g3dUFRS0xEbGpTZGdCQWZ2TXRqQm9Ma1FBUVp6UXllZmNBQUpPLytZOUFLd0VBelplazR3QUF2T2dZWEtpVUYwekdDQUFBUktDQktyQkJCd3pCRkt6QURwekJIYnpBRndKaEJrUkFEQ1RBUEJCQ0J1U0FIQXFoR0paQkdWVEFPdGdFdGJBREdxQVJtdUVRdE1FeE9BM240QkpjZ2V0d0Z3WmdHSjdDR0x5R0NRUkJ5QWdUWVNFNmlCRmlqdGdpemdnWG1ZNEVJbUZJTkpLQXBDRHBpQlJSSXNYSWNxUUNxVUpxa1YxSUkvSXRjaFE1alZ4QStwRGJ5Q0F5aXZ5S3ZFY3hsSUd5VVFQVUFuVkF1YWdmR29yR29IUFJkRFFQWFlDV29tdlJHclFlUFlDMm9xZlJTK2gxZEFCOWlvNWpnTkV4RG1hTTJXRmNqSWRGWUlsWUdpYkhGbVBsV0RWV2p6VmpIVmczZGhVYndKNWg3d2drQW91QUUrd0lYb1FRd215Q2tKQkhXRXhZUTZnbDdDTzBFcm9JVndtRGhESENKeUtUcUUrMEpYb1MrY1I0WWpxeGtGaEdyQ2J1SVI0aG5pVmVKdzRUWDVOSUpBN0prdVJPQ2lFbGtESkpDMGxyU050SUxhUlRwRDdTRUdtY1RDYnJrRzNKM3VRSXNvQ3NJSmVSdDVBUGtFK1MrOG5ENUxjVU9zV0k0a3dKb2lSU3BKUVNTalZsUCtVRXBaOHlRcG1ncWxITnFaN1VDS3FJT3A5YVNXMmdkbEF2VTRlcEV6UjFtaVhObXhaRHk2UXRvOVhRbW1sbmFmZG9MK2wwdWduZGd4NUZsOUNYMG12b0Irbm42WVAwZHd3TmhnMkR4MGhpS0JsckdYc1pweGkzR1MrWlRLWUYwNWVaeUZRdzF6SWJtV2VZRDVodlZWZ3E5aXA4RlpIS0VwVTZsVmFWZnBYbnFsUlZjMVUvMVhtcUMxU3JWUStyWGxaOXBrWlZzMURqcVFuVUZxdlZxUjFWdTZrMnJzNVNkMUtQVU05Ulg2TytYLzJDK21NTnNvYUZScUNHU0tOVVk3ZkdHWTBoRnNZeVpmRllRdFp5VmdQckxHdVlUV0pic3Zuc1RIWUYreHQyTDN0TVUwTnpxbWFzWnBGbW5lWnh6UUVPeHJIZzhEblpuRXJPSWM0Tnpuc3RBeTAvTGJIV2FxMW1yWDZ0TjlwNjJyN2FZdTF5N1JidDY5cnZkWENkUUowc25mVTZiVHIzZFFtNk5ycFJ1b1c2MjNYUDZqN1RZK3Q1NlFuMXl2VU82ZDNSUi9WdDlLUDFGK3J2MXUvUkh6Y3dOQWcya0Jsc01UaGo4TXlRWStocm1HbTQwZkNFNGFnUnkyaTZrY1JvbzlGSm95ZTRKdTZIWitNMWVCYytacXh2SEdLc05ONWwzR3M4WVdKcE10dWt4S1RGNUw0cHpaUnJtbWE2MGJUVGRNek15Q3pjck5pc3lleU9PZFdjYTU1aHZ0bTgyL3lOaGFWRm5NVktpemFMeDViYWxuekxCWlpObHZlc21GWStWbmxXOVZiWHJFbldYT3NzNjIzV1YyeFFHMWViREpzNm04dTJxSzJicmNSMm0yM2ZGT0lVanluU0tmVlRidG94N1B6c0N1eWE3QWJ0T2ZaaDlpWDJiZmJQSGN3Y0VoM1dPM1E3ZkhKMGRjeDJiSEM4NjZUaE5NT3B4S25ENlZkbkcyZWhjNTN6TlJlbVM1RExFcGQybHhkVGJhZUtwMjZmZXN1VjVScnV1dEsxMC9Xam03dWIzSzNaYmRUZHpEM0ZmYXY3VFM2Ykc4bGR3ejN2UWZUdzkxamljY3pqbmFlYnA4THprT2N2WG5aZVdWNzd2UjVQczV3bW50WXdiY2pieEZ2Z3ZjdDdZRG8rUFdYNnp1a0RQc1krQXA5Nm40ZStwcjRpM3oyK0kzN1dmcGwrQi95ZSt6djZ5LzJQK0wvaGVmSVc4VTRGWUFIQkFlVUJ2WUVhZ2JNRGF3TWZCSmtFcFFjMUJZMEZ1d1l2REQ0VlFnd0pEVmtmY3BOdndCZnlHL2xqTTl4bkxKclJGY29JblJWYUcvb3d6Q1pNSHRZUmpvYlBDTjhRZm0rbStVenB6TFlJaU9CSGJJaTRIMmtabVJmNWZSUXBLaktxTHVwUnRGTjBjWFQzTE5hczVGbjdaNzJPOFkrcGpMazcyMnEyY25abnJHcHNVbXhqN0p1NGdMaXF1SUY0aC9oRjhaY1NkQk1rQ2UySjVNVFl4RDJKNDNNQzUyeWFNNXprbWxTV2RHT3U1ZHlpdVJmbTZjN0xubmM4V1RWWmtIdzRoWmdTbDdJLzVZTWdRbEF2R0UvbHAyNU5IUlB5aEp1RlQwVytvbzJpVWJHM3VFbzhrdWFkVnBYMk9OMDdmVVA2YUlaUFJuWEdNd2xQVWl0NWtSbVN1U1B6VFZaRTF0NnN6OWx4MlMwNWxKeVVuS05TRFdtV3RDdlhNTGNvdDA5bUt5dVREZVI1NW0zS0c1T0h5dmZrSS9sejg5c1ZiSVZNMGFPMFVxNVFEaFpNTDZncmVGc1lXM2k0U0wxSVd0UXozMmIrNnZrakM0SVdmTDJRc0ZDNHNMUFl1SGhaOGVBaXYwVzdGaU9MVXhkM0xqRmRVcnBrZUdudzBuM0xhTXV5bHYxUTRsaFNWZkpxZWR6eWpsS0QwcVdsUXl1Q1Z6U1ZxWlRKeTI2dTlGcTVZeFZobFdSVjcycVgxVnRXZnlvWGxWK3NjS3lvcnZpd1Jyam00bGRPWDlWODlYbHQydHJlU3JmSzdldEk2NlRyYnF6M1diK3ZTcjFxUWRYUWh2QU5yUnZ4amVVYlgyMUszblNoZW1yMWpzMjB6Y3JOQXpWaE5lMWJ6TGFzMi9LaE5xUDJlcDEvWGN0Vy9hMnJ0NzdaSnRyV3Y5MTNlL01PZ3gwVk85N3ZsT3k4dFN0NFYydTlSWDMxYnRMdWd0MlBHbUlidXIvbWZ0MjRSM2RQeFo2UGU2VjdCL1pGNyt0cWRHOXMzSysvdjdJSmJWSTJqUjVJT25EbG00QnYycHZ0bW5lMWNGb3FEc0pCNWNFbjM2WjhlK05RNktIT3c5ekR6ZCtaZjdmMUNPdEllU3ZTT3I5MXJDMmpiYUE5b2IzdjZJeWpuUjFlSFVlK3QvOSs3ekhqWTNYSE5ZOVhucUNkS0QzeCtlU0NrK09uWktlZW5VNC9QZFNaM0huM1RQeVphMTFSWGIxblE4K2VQeGQwN2t5M1gvZko4OTduajEzd3ZIRDBJdmRpMnlXM1M2MDlyajFIZm5EOTRVaXZXMi9yWmZmTDdWYzhyblQwVGVzNzBlL1RmL3Bxd05WejEvalhMbDJmZWIzdnh1d2J0MjRtM1J5NEpicjErSGIyN1JkM0N1NU0zRjE2ajNpdi9MN2EvZW9IK2cvcWY3VCtzV1hBYmVENFlNQmd6OE5aRCs4T0NZZWUvcFQvMDRmaDBrZk1SOVVqUmlPTmo1MGZIeHNOR3IzeVpNNlQ0YWV5cHhQUHluNVcvM25yYzZ2bjMvM2krMHZQV1B6WThBdjVpOCsvcm5tcDgzTHZxNm12T3Njanh4Kzh6bms5OGFiOHJjN2JmZSs0NzdyZng3MGZtU2o4UVA1UTg5SDZZOGVuMEUvM1B1ZDgvdnd2OTRUeis0QTVKUkVBQUFBR1lrdEhSQUQvQVA4QS82QzlwNU1BQUFBSmNFaFpjd0FBQ3hNQUFBc1RBUUNhbkJnQUFBQUhkRWxOUlFmZEN3TVVFZ2FOcWVYa0FBQWdBRWxFUVZSNDJ1MTllVmlVWmZmL21RMFFsV0ZuMkFWY3dJVWRBZGRjRURSTnpTVlJNeTJWeXJjMFUzdlRNbE96c3NVMUJkejNGUVFHbUkyQkFmU0hTbTVaV2ZvbStwYml2bVVLZ3B6Zkg5L09jODA4Z2t1dk92TU05N2t1cm5OWkxQT2MrM3crOStjKzk3bnZCNEFaTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmp4b3daTTJiTW1ERmpabjRUc1JDWTJoZGZmQ0ZDUkZGZFhaMm9vcUlDS2lvcVJBQUFpQ2hDUkJZZ0lTVzNTSVFpa1FoYXRHaUJBUUVCOUcrY09YTW1HOGpHVGdEejU4OFhWVlJVaUNzcUtpUUFJRDE5K3JUMHpKa3pNZ0N3QlFBWkFFZ0JRQUlBNHIrL0dGa0t6eEFBNnY3K3VnOEF0UUJRQXdEVkxWcTBxQWtJQ0tnRmdGcC9mLy83Z1lHQmRiTm56MFpHQUZacWMrZk9GWjA1YzBaU1VWRWhQWDM2dE8zWnMyZnRBYUNwcDZlbmMxeGNYRXVGUWhIbzZlbnAzNlZMbDBBM056ZUZyYTF0TXhzYm0yWVNpY1JXTEJZM1pWZ1NJUG9Sb2FhbTVpOEFxSzZxcXJwZFZWVjErOUtsU3hmKzMvLzdmNmNyS3l2UFhyaHc0WFI1ZWZsL0tpc3Jyd0hBWDM1K2ZuY0NBZ0txL2YzOWEvMzkvZS9QbXpjUEdRRUkyT2JNbVNNNmMrYU05TXlaTTdZR2c2RXBBRFR2MkxGallFeE1USHhpWW1MSDBORFFTQnNiRzBWTlRRMVVWMWZEdlh2M29LYW1CdXJxNnFDdXJnNFFrZnRpSmx3VGk4VWdFb2xBSkJLQldDd0dpVVFDTXBrTWJHeHNRQ3FWd3QyN2R5OGNQMzc4aUU2bk8zRDQ4T0d5UTRjT25RYUFQN3QyN2ZvWEFGUjM3ZHExZHNHQ0JjZ0lRQ0EyWnN3WXlkbXpaKzJLaTR1YjJkblpPUThaTXFSYi8vNzlFenQyN0JodFoyZm5lK2ZPSGJoejV3N1UxTlJBYlcwdDkzTzF0YlZ3N3R3NXVIMzdObFJXVm9KVUtvWEt5a3BvMHFRSlhMNThHZHpkM2VIU3BVdk1DOFM3dWJuQjNidDN3ZFBURTJwcmE4SFQweE9hTldzRzN0N2VJSlZLVFFoQ0twV0NyYTB0Mk5uWndaMDdkLzRvTHk4dlY2bFUycHljbkpMcTZ1cXJYYnAwdWUzbjUxZTFkZXZXKzR4U0xkQSsvUEJEMGF1dnZpcno5L2QzQklDQVhyMTZEVm0xYXRYMjMzLy8vZXFaTTJmdytQSGpXRjVlanZ2Mzc4ZXlzakpVcVZUNDZhZWY0dFNwVTdGNzkrN1l1M2R2dExPenc3Q3dNSlJLcFJnUkVZRlNxUlFqSXlOUkpwTmhWRlRVUTMxMGREVHpadkNQR3BmSXlFaVQ4UXdMQzBNN096dnMzYnMzZHUvZUhhZE9uWXB6NXN4QmxVcUZaV1ZsV0ZaV2hnY1BIc1REaHcvanp6Ly9qQ2RPbkxpK1pNbVNIZDI2ZFJzQ0FBRyt2cjZPeWNuSnN1blRwN09ha0NYWUJ4OThJQm8xYXBTTm41K2ZzNTJkWGZENDhlT24vL0RERDhmT25UdUhQLzMwRTVhWGwyTlpXUmtXRmhiaWloVXJjT2pRb1ppUWtJQlNxUlREdzhOUktwVnl5UlFiRzRzeW1Remo0K05SSnBOaHAwNmRVQ2FUWWVmT25kSEd4cVpCMzZWTEYrYk42QjgyUHNialNPTks0eHdkSFcyU0J3a0pDVGhreUJCY3NXSUZGaFlXWWxsWkdlN2Z2eDhQSHo2TUowNmN3SktTa2g5R2pSbzEzZGJXTnRqWDE5ZDV4SWdSTnUrLy96NGpBbk5aY25LeXpOZlgxOG5lM2o1a3hvd1pjeXNxS3Y0NGMrWU1Iamx5aEp2cDA5TFNNQ2twQ1dOaVlreG1kRXFDVHAwNm9ZMk5EWGJ0MmhWdGJHendoUmRlUUJzYkcrelJvd2ZhMnRwaXo1NDk2L1c5ZXZWaTNnSjlRK1BWbzBjUGsvR2w4U1p5b0h5SWlvcENxVlNLTVRFeDJLZFBIMHhOVGVXVVFYbDVPUjQvZmh3UEhUcjB4NlJKaytZMmFkSWt4TWZIeDJuWXNHRXloc2JuYU1PSEQ1ZjQrUGc0QUVEUU8rKzhNL1AwNmRPL256NTlHZzhkT29SbFpXV28wV2h3d29RSjJMVnJWNVJLcFp3Y2pJdUxRNWxNWmdKMjQrUkpTRWhBVzF0YlRFeE1SRnRiVzB4S1NtTGVpanlOSzQwempUdWZGQ2hQaUF5NmR1Mks0OGVQUjQxR2cyVmxaWGpnd0FFOGR1d1lscGVYL3o1Ky9QaVpBQkRrN2UzdDhQTExMMHNZT3AraFRaMDZWUlFmSDI4SEFGNUpTVW5KUjQ0Y09Ycm16Qms4ZlBnd2xwV1ZZWFoyTms2YU5BbnQ3ZTI1bVQ0dUxzNWtjR2xtNTRPOWI5KythR3RyaXkrKytLS0o3OSsvUCtmdDdPeVlGNUEzSGovK3VOSjQ4MG1CbEFLZkRDSWpJOUhlM2g0blRacUUyZG5aWEszZ2h4OStRSTFHYzdSNzkrN0pBT0RWc1dOSHUwbVRKckZsd2RPMm9VT0hTcnk5dlIwVkNrWGt1blhydHA4L2Y3NzIyTEZqdUgvL2ZsU3BWRGhreUJDTWlJaEFtVXlHSFR0MlJKbE14cTBSK2FDbkdhRmZ2MzRtNEI0d1lBRGEyZG5oU3krOVpPSUhEaHpJdklBOWZ6eHBuSWtjS0E4b0wvaGswS1ZMRjVPOGlvaUl3Q0ZEaG5DRncvTHljdnpoaHg5cXYvNzY2KzF1Ym02UlhsNWVqb01HRFpJeTFENEZtekpsaW1qbzBLRzJBT0RWdjMvL2NXZk9uRGwvOHVSSlBIandJQm9NQnB3NWN5WTJiZHFVbS9GcFRVL3luZ2JUZUlhdkQrd05KYytnUVlPWXR3TC9LSEtnZk9BckJNb2ZXaVpRelNBeU1oS2JObTJLTTJmT1JJUEJ3QlVMeThyS3ppY2tKSXdEQUsrQkF3ZmF2dlhXVzB3Ti9BL2dGM3Q3ZXplMXM3TnJ2V0xGaXRYbnpwMnJQWExrQ083YnR3K1hMVnVHdlhyMVFwbE1oakV4TVNheWpkWjJ4T2lQQXYzakp0SGd3WU9aRjVCL1VuSm9pQXdvajNyMTZtV1NaekV4TVNpVHliQlhyMTY0ZE9sUzNMZHZIKzdmdngrUEhEbFNPMi9ldkRXMnRyYXRQVDA5bTc3MTFsdGlodVovQm43SG9LQ2d6dnYyN1R2dzIyKy80WUVEQjFDdjErT0lFU013TEN5TTI5cDUySXhQOHI2aG1aN05rTXcvVEJuUU1xRWhSVUJiaTJGaFlUaGl4QWpVNi9WWVZsYUdodzRkd2wyN2RoMzA4L1ByN09ucDZmam1tMjh5RW5pQzliNFVBRnpqNCtPSFZsUlVWUDcwMDA5WVZsYUcyN2R2eDRDQUFHNnRUL3U5dE5YRFpuem1uNmNpNk5tenAwbS9RVVJFQkxabzBRSzNiZHVHKy9idHc0TUhEMkpKU1VsbGVIajRVQUJ3ZmVtbGwxaGQ0REhBTHdNQXhXdXZ2VGJwanovK3VIMzA2RkhjdDI4ZmZ2MzExeWlYeXpFcUtvcVRZYmEydHRpN2QrL0htdkVaeUpuL0orVHdLRVZBK1VmTGdxaW9LSlRMNWZqMTExOXpTNElEQnc3Y0hqeDQ4TDhBUURGZ3dBRFdNL0FJOEh0Tm16WnQ1cmx6NSs0ZE9uUUk5KzNiaCsrKys2N0pXcjk3OSs0bWNxeGZ2MzRtVE0xQXoveXpKQVBLTTlvOW9EenMzcjI3U1czZzNYZmY1VWlndkx6ODNyaHg0MllDZ0JjamdZZUEvK09QUDU3NysrKy8zejk0OENBV0ZCVGcyTEZqdVMwWVkvRDM2ZFBIQlB4c3JjLzg4NjROR0pNQTVTT1JBRzBaamgwN0Znc0tDbWhKY1AvTk45K2MrL2VPRmlNQnNpRkRoa2dCd1BQRER6LzhoTUN2MVdweCtQRGhYSnVtY2FHUG1qZjRhMzIybGNmODg5eEM1TmNHS0MrcFFFanR4Y09IRDBldFZrdHE0UDc0OGVNL0FRRFAvdjM3czVyQTBLRkRKUURnL3M0Nzcwei8vZmZmYXdqOGd3Y1BOdW5rbzJZZUtzQ3dHWjk1Uzl3dG9QeWtKaUxxSkJ3OGVMQXhDZFFrSnlkUEJ3RDMvdjM3Tjk3MjRjbVRKNHU5dmIyZGs1S1N4dnorKys5VkJ3OGVSSjFPaDBPSERqV1orZm5ncDVtZmRld3hiMGtkaHZ4ZEFpSUJVZ0pEaHc1Rm5VNkgrL2J0dzlMUzBxb3VYYnE4cGxBb25DZE9uTmo0dGdqZmZmZGRrYmUzdDBPSERoMzZuajE3OXZxaFE0ZXdzTEFRazVPVDZ3Vi9RN0tmZ1o5NVN5Q0JocFlEZkJKSVRrN0d3c0pDM0xkdkgrcjErdXN0Vzdic3ExQW9IQ1pNbU5DNE9nWmpZMk9idUxtNWhSODdkdXprMGFOSHNiUzBGRk5TVXRqTXo3elZLNEdVbEJRc0xTM0Z2WHYzNHU3ZHUwKzZ1TGlFUjBaR05tbE1SVDhaQVBoblpHU29mdjc1Wnl3dExjVzVjK2VhVlBzZnRlWm40R2Zla2ttZ29ab0E3UTdNblRzWFMwdExjZCsrZmZqVlYxK3BBTUMvVWV3TVRKNDhXUXdBYnRPblQ1OTkrdlJwM0x0M0w2NWF0UXB0YlcyNWZmNUhWZnNiT3JYSFBQUG05UHo4YkdoM0lDWW1CbTF0YlhIVnFsVllXbHFLcGFXbE9IcjA2RThBd0czQ2hBbldYUS93OXZadUZob2EydmZNbVRPM0R4dzRnRXFsRWwxY1hEQTZPcHJiNTdleHNYbmttcDk1NW9WQUJzWWtZSnpmMGRIUjZPTGlnams1T1ZoYVdvbzZuZTcyMy9XQVp0YmU3Qk5vTUJnT0hqMTZGRXRLU2pBbUpvWTd5dHV0V3plMHNiSGhtaXJZek0rOE5TbUJQbjM2b0kyTkRYYnIxbzA3VWh3ZEhZMGxKU1ZZVWxLQzZlbnBCd0VnMENvN0JmK1cvcTdUcDAvLzlOU3BVMWhhV29wVHAwN2xUdlhSNVIzODlsNytaUjNNTXk4a3orOFlURWhJTUxsa0pDd3NES2RPbllvbEpTVm9NQmh3OU9qUmN3SEExZXEyQnVQajQ1djQrZm5GL2ZiYmI5ZjM3OStQbVptWjNHMjhkSWtISGF4ZzRHZmVta21nZCsvZUpwZUxSRWRIWTJabUpwYVVsR0J1YnU1MUR3K1B1T2pvYU92WkZYai8vZmZGQU9DVm5wNisvZmp4NDFoY1hJeXZ2UEtLU2FjZlhlTFJ0MjlmVGpZeEVtRGVXc0JQK1V5bkNPbHlFZW9VZk9XVlY3QzR1QmdOQmdQKys5Ly8zZzRBWGxaemtVaW5UcDJhUmtkSHYzajY5T2w3ZS9mdXhSVXJWbkJYTC9PMy9JeUR4U2NCNXBrWG91Zm5NMzlya0s2cy8rNjc3N0M0dUJqVmF2Vzk0T0RnRjJOaVlvVC9Uc3JwMDZkTEFNQm4rL2J0K1VlT0hNSGk0bUpzMmJJbFJrWkdtcHp1UzB4TTVHUVNBei96MWtvQ2xOKzB5MFc3QXBHUmtkaXlaVXRPQmN5Yk55OGZBSHdtVFpvazdMTUNuVHQzYmhvZkgvL1NiNy85Vmx0YVdvcWZmdm9waG9hRzFsdjRhMGorTTgrOE5aR0E4ZlZpeGdYQjBOQlEvUFRUVDBrRjFMWnIxKzRsUWF1QUdUTm1pQUhBYS8zNjlWbUhEeDlHZzhHQVBYdjJOTG5Mei9nQ3ovb1VBUFBNVzVPbi9PWmZORXAzQy9iczJSTU5CZ01XRmhiaXJGbXpzZ0RBYTlLa1NXS2h6djUyclZxMTZuYnExS203cGFXbHVIanhZcFJLcGZXMit6THdNOTlZU2NDNFRWZ3FsZUxpeFl2UllEQ2dVcW04NitQajB5MG1Kc1pPY09DZk5tMmFDQUJjNTh5WnMrTFlzV05vTUJnd05EUVVJeUlpVE83MDY5T25EeWVMaklQRFBQUFc3Q25mcWVtTjdoU01pSWpBME5CUU5CZ01XRkJRZ09QR2pWc0JBSzZDZTl2UXlKRWpaUktKcFBVUFAvend4OTY5ZTNIOSt2WFl2bjE3azl0ODZaWGNmQVhBUFBPTndWUGVVMThBM1M3Y3ZuMTdYTDkrUFJZVkZlSG16WnYvRUl2RnJRY1BIaXlzN2tCZlg5OW1RNFlNbVhEaXhBa3NLaXA2NEtpdjhWWGVUQUV3MzFnVkFQK0tjZU1qdzBWRlJhaFNxYkJyMTY0VHZMeThoSE5HNElNUFBoQUJnR0xWcWxWWjVlWGxxTlZxVVM2WGN6My90UFZCOG9lQ1FOVlI1cGx2REo3eW5zNElkTy9lblRzajRPRGdnRnF0RmdzS0NuRDY5T2xaQUtENDE3LytKWXhsd0toUm8yUzJ0clp0Zi9ycHAyc2xKU1U0Yjk0ODdOQ2h3d1B5bjRHZmVVWUNTU2J0d2JRTTZOQ2hBODZiTnc4TEN3dHgyN1p0MTJReVdWdkJMQU82ZHUzYWRPREFnZU4rL1BGSExDd3N4REZqeHFCVUttM3dtaStoazhBL2ZWODlBMEhqamlOOS92cXVENU5LcFRobXpCZ3NMQ3pFM054YzdOU3AwN2lPSFRzMkZZcjhkMXV3WU1INjh2SnkxT2wwSnZLL1c3ZHVKaTlUNEpPQVVEeDlidkswbkNGUHowZWUvLy81UHkrMDUyZHhmTHJQVDg5bmZGUllMcGVqVHFkRHJWYUw0OGVQWHc4QWJ1Kzg4NDVsTHdObXpab2xBWUNBQXdjT25Dd3RMY1Z2di8yV3EvN1RxVDlxL2hIYW9EV1VyTFNjb2VlaUFpZmYwLytuNzIrc1pNRGlXSDg4cUNtSVRnbTJiOThldi8zMlc5VHI5Wmllbm40U0FBTGVmZmRkeTI0Tjd0YXRtNDIzdDNmc1R6LzlWRk5ZV0lpVEowODJPZmpEZjRzdmY5QXMxZk5uSkVwQ1dzNVFZWlAyYzZuTm1UejlkenI3UUQ5SHY0Yy93d2tsTGl5T1Q4ZnozenBNQjRRbVQ1Nk1lcjBlZCszYVZlUGk0aEliR3h0clkra0UwR3pZc0dGdkhUdDJEUFY2UFlhSGg1dGMrbUhNM0VKUFZyckJpQXFiZExTWk9oMzVudjQvZlQ4dGg2eWRERmdjSDg4VExvd3ZDd2tQRDBlOVhvODVPVG5ZdFd2WHR6cDI3R2p4MjRFdTc3Ly8vc3FEQncraVhxL253TTkvdzQrbER3cGZscEw4cEJtS2xqUDBJc2pJeUVoczBxUUpKaVFrWUh4OFBMNzIybXM0YU5BZ0hEdDJMSGJxMUFrVEVoTFEzdDZlZTdVNUtTTDZQVFNqMGQ5NWxMd1ZHdmlmTkk1OSt2VEIrUGg0SERWcUZBNGFOQWhIalJxRmNYRnhtSkNRZ0haMmRseE55VnJpU0orUC8wYWgwTkJRMUdxMXFGYXJjZWpRb1NzQndNVmlrVDl6NWt3UkFIaGxaV1VaU2twS2NQUG16U2lWU3JuQjRyL1NtMS9Rc1JUUG42bElsdEdNUTFjN1IwUkVZSFIwTkg3NDRZZTRkT2xTVkt2VldGQlEwT0NYUnFQQjVjdVg0OHlaTXpFMk5wYUxDODFzOVB0cG1kVFFUQ1lVL3lSeDdOaXg0MlBIVWFWUzRhSkZpM0Q2OU9rWUVSSEJrYXJRNDJqOHFuRWlRNmxVaXBzM2IwYU5Sb1B6NXMwekFJRFg1TW1UTGJNUStQSEhIMHNBSUdqLy92MW5pNHFLY1BiczJWd0JNRDQrM29TWmhaSzBORlBSNmNXb3FDaDBkM2ZIano3NkNIZnYzczFWYWZQeThuRFBuajI0ZGV0V1hMOStQYTVldlJyVDA5Tng3ZHExdUhIalJ0eTVjeWRtWjJlalNxVkNuVTZIQlFVRm1KbVppYk5uejBaL2YzL3VmZ1Q2Ty95WlRHZ2tRSitYUCtQVDgwVkdSbUpBUUFET25qMGJNekl5Nm8zamhnMGJjTTJhTmJocTFTcGN0MjRkRjhlY25CeFVxOVZjSEhmdTNJa2ZmdmdodXJtNVlWUlVWTDF4RkFvSlVMem9kR0Q3OXUxeDl1elpxTlBwTUMwdDdTd0FCRTJaTWtWaXFldC9tVmdzYm52czJMRXF2VjZQTTJiTVFLbFVhbkxsdHpIVDhiZDR6TzNwYzlFeWhRcE9ORlBGeDhmajlPblRVYVBSb0ZhclJhVlNpUnMzYnNTbFM1ZFdmL2poaDBkZmV1bWw5WjA3ZC80NFBEejg5Ylp0Mnc1dDBhSkZZa2hJeU5Dd3NMQnhuVHAxK25qQWdBRnJQL3JvbzhPcHFhbFZPM2Z1eFB6OGZOVHBkS2pUNlhEbXpKbGNFd2pOWktTWTZQTllhdHllTkk2ZE8zZkdEei84a0FOOVRrNE94YkdLNHRpcFU2ZVB3c1BEMytqUW9jUElGaTFhSklhR2hvNktpSWdZMzZsVHA0OWZmdm5sVFhQbnp2MXAxYXBWOTNidjNzMlJxbHF0eHZmZWU0OXJwNlcrRTRvamYxbGdxWEV6dmpwY0twWGlqQmt6c0tDZ0FEZHYzbHdsRm92YnhzWEZ5U3lWQUd3akl5TjdIemx5QkhVNkhRNFlNSUM3L0tOejU4NzFNckdsSmkxVm5XbHRPbjc4ZU16SXlFQ3RWb3Q3OXV6QjFOUlVuRFp0V25tblRwMCtkbkJ3NkFnQS9rVkZSYjN4SVZaVVZOUWJBUHliTjI4ZTNibHo1NW16WnMzYXYzbno1cnJjM0Z6VTZYU1lsWldGYjcvOXRzbmFsZ3FuRFJXNExNM3pDM3o4T0w3OTl0dTRaODhlMUdxMW1KbVppU3RXckxnL2RlclUvZkh4OFI4MWI5NDg1bkhpT0hYcTFOWUEwTUxKeWFsVDE2NWQ1M3o2NmFkSHRtelpnbmw1ZWFqVDZYRDM3dDA0ZHV4WWt6Z0toVXdwZmpRWmhJYUc0b0FCQTFDbjArR09IVHV3WmN1V3ZlUGk0bXd0bFFDYURoZ3dZTnozMzMrUE9wME9CdzBhWkxJRnlKZGpOQWptOXNaSmE3eUdqSTZPUmljbkoxeTRjQ0UzNDZlbnArTTc3N3l6TnpnNGVDUUFCTlRXMWxiZ1A3RGEydG9LQUdnUkhCdzhiTnEwYVVYYnQyOUhsVXFGV3EwV2x5eFpnaTR1THB5Y3BRSVhyYUg1TTVtbGVEclFRcCtUUG5kVVZCUTZPenZqa2lWTHVEaW1wYVhoVzIrOVpRZ0tDaG9LQUMzK2FSeXJxcW9NQUJBWUdocjY2c2NmZjN4ZzU4NmQzUEpnd1lJRktKZkxPUVZLNDhvblUwdkxRMUlBdEJVNGFOQWdqdGhpWTJQSHhjYkdXbVpIWU5ldVhac25KeWRQcDlkOHQyclZpdHNGb09CYld2STJCUDZvcUNoMGMzUERUWnMyb1VhandSMDdkdUJubjMxMk1Tb3FhaklBQk9CVE5BRHdqNDZPZnZPNzc3NDdwMVFxVWF2VjR1Yk5tOUhUMDVNckZGbzZDZFFIZmlwa0tSUUtycEMxZmZ0Mm5EZHYzdm13c0xDM0FhREZVNDVqWVBmdTNhZWxwNmRmeWMzTlJhMVdpeHMyYkRBaFUwc25BWW9qS1lDd3NEQnMxYW9WNm5RNjNMTm5EM2J2M24xNng0NGRtMXNrQWZqNStUbU9IVHQyZmxsWkdlcDBPb3lMaTdOb0JkQlFkVG9xS2dvVkNnVnUyN1lOMVdvMWJ0aXdBU2RObWxUcTR1TFMrZmJ0Mit2eEdWaFZWWlhCMmRtNTR3Y2ZmRkNRbFpXRldxMFdkKzNhaFg1K2ZseVYyN2l3WlV3QzVvcW5jY2VlOGVlaUFsWkVSQVQ2K3ZyaXJsMjdVSzFXNDdwMTZ6QWxKVVh2NU9RVVcxVlZaWGdXY2J4eTVjcW43dTd1M2ViT25icy9PenViSTFQakFtRkR1d1NXcWdEaTR1SlFwOU5oVGs0T0ppUWt6UGZ5OG5LMDFKMUFwL0hqeHk4cUxTM2xqZ0R6RlFDZmVjM2xDVHoxZ2QvRnhRVTNiZHFFS3BVS1Y2OWVqY25KeWJza0VrbHJmQTRtRm90YlRwdzRjV05tWmlhcTFXcmN1WE1uK3ZuNVlYaDRlTDBrWU81NGtuTGlnejg4UEJ4OWZYMXh4NDRkbUorZmo2dFdyY0xodzRkdkVvbEVMWjlISEdVeVdmRGt5Wk96OXV6Wmd4cU5CamR1M0ZpdkVpQVM0Sk9wdWVOcHJBRGtjamxYTEUxTVRGd0VBRTZXU2dET0V5ZE9YRmxTVW9KYXJSYmJ0Mjl2Y2djZ1h3RllTckNwVUJVZEhZMU5talRCOVBSMFZLbFV1SGJ0V2h3K2ZQaW1weTM1SDBQSytyMzIybXZMTEowRUhoZjg2ZW5wT0hEZ3dPVUE0UCtjNHhqNHpqdnY3TXpPemthTlJvT3BxYW5ZcEVrVHJpWkE0MjRwa3hKZkFkQWRnZTNidCtkcUowbEpTU3NBd05saUNTQWxKV1cxd1dCQXJWYUxVcW0wUVFYUTBFR1A1K1g1NEtjcTllelpzMUdqMGVDV0xWdHczTGh4dVFBUWlHWXdBUEN0andUNG5aWFVSc3VmeVo2MUorVkVmNTg2MThMQ3dob0N2Njg1NGlpVlNsdk5talZMazV1Yml4cU5CcWRQbi83QTdvQWw1cVd4QXBCS3BhalZhakUzTnhmNzlldTMycElKd0NVbEpXVjFVVkVSYWpRYURBNE9ObEVBMUxOdENVRTI3a0duL2VuRXhFUlVxOVdZa1pHQkgzNzQ0Uy8yOXZhaGFFWWpFc2pJeUVDVlNvVTdkdXhBWDE5ZnM1UEFvOEMvZmZ0MnpNdkx3N1MwTkh6cHBaZk1CbjZ5NXMyYmg2V21wdjZhbjUrUGFyVWFFeE1UVGZvdCtHY0p6SjJmeG5rcGxVb3hPRGdZTlJvTktwVks3TnUzNzJwTGJnYzJJUUJqQldCY3hUWU90cms4QlptYVJrSkRRM0hKa2lXWWw1ZUhTNWN1cmZMeDhSbUlGbUNQSWdIalpwZjZUc2s5YmM4L3JVZnhzMVR3azdWdTNYcFFWbFpXbFZxdHhrV0xGbkUzVkZIOCtDUmdMcy9mUlNFRklFZ0NJQVZBY3N0U2dzeHZTdzBQRCtkbS95MWJ0dURMTDcrOEJnQTgwVUxNVWtoQXFPRC9PNGFlNzd6enpycjgvSHpVYURUWXUzZHY3b3A2ZnR1d3BVeE90QXNnS0FVd2NlTEUxWVdGaGFoV3F6a0ZZQnhrY3l1QStxcitNcGtNTjI3Y2lMbTV1ZmpsbDE5ZXNiZTNqMEFMTXo0SmJOKytIWDE5ZmJsT1M1S3pWTk40MnNsTTRLZmZUOHVtME5CUUUvQ25wcVphSFBqSm5KeWNvdmZzMlhOZHJWWmplbm82eW1TeUJuY0Z6SjJmaEJkU0FHcTFHbk55Y29SRkFHM2F0REU1QzBEdG1CUmtjM21hd2Fqd04yREFBRlNwVkxoMTYxWjg4Y1VYbHorcUZkV2NKREJtekpobHUzZnZ4dno4L01jbWdmODFYbzhDLzdadDJ6QTNOeGRUVTFOeHdJQUJGZ2wrYWlHZU5HbFNta3FsUXJWYWpVbEpTZlcyQzF0S2Z0SlpnRFp0MmdpVEFLUlNLWWFHaHRZcnM4d1ZYSDdocWtPSERqaDU4bVRNejgvSFpjdVdWVGs1T1hWR0M3Ym5UUUxXQW40eVgxL2Y3bXExdWthbFV1SGJiNy9OeGMyNG9Hck8vT1F2VDBORFE2MUhBVkFTa2N4NTN0NzRFZ3JxVkpOS3BiaGp4dzdNeXNyQzk5NTdyOWpTRS9oaEpFQ0ZMVDRKR084U1BJbW5uK09EdjBPSERvSUVQL1ZZckZxMWFyOWFyY2F0VzdlYTNGZGhmS21JT2ZQVXVDOUZrQXBBcjllalNxVkNpVVRDTVN5L2VjWGN3U1g1MzcxN2QxU3BWTGhseXhiczBxWExwLy8wVUlxNVNHRFhybDJZbDVlSDI3WnRlNm9rOERqZ1Z5cVZ1SExsU3NHQUh4R3h1cnJhTUd6WXNNODBHZzJxVkNydStpMSt2TXc5U1ZGVFZXaG9LRW9rRWxTcFZKaWRuWTFKU1VuQ0lZRFdyVnVqVkNwOW9OQkNEL204UGEydGpPVi9VbElTNXVmbjQ1bzFhekF3TUxBZkNzZ2VSUUswdHFXNEcrOFNQRTZjNk9lSUxCc0EvektoZ0o4c0ppWm1JTDEycTNmdjNseTgrSDBWNXNwVDR3SzFWQ3JGMXExYkM1TUFKQktKeFFhWHJsdWFPWE1tNXVYbDRiSmx5MjRDUURBS3pKNDJDVmc3K1A4K2I5RzJzTER3amtxbDRpNnRvUnVaekQxSjFWZWpFcVFDeU0vUDV4UUFCWmZXV1BTUXo5dno1V3k3ZHUxdy92ejVxRlFxOGJQUFBqdnh2SHYrbnlZSnZQcnFxeHdKYk4yNkZYMTlmYm5yMktnR1EvSG5Md3Y0OGFIdmk0Nk81cTZsOHZYMXhhMWJ0d29lL0hSR0lEYzM5emUxV28yZmZQSUp0bXZYN3FITHB1ZnRLZjQwU2JWdTNScno4L014S3l0TEdBUlFVRkNBK2ZuNUpncUEzNnhpcnVBYUgxaVJTcVc0YXRVcXpNN094bG16WnUwREFCOFVxQkVKN055NUUzTnpjeCtiQlBqMzd6OE0vRGs1T2JoaXhRcnMzNysvWU1GUHNkcStmZnQralVhRGFXbHBLSlZLSHpob1phNzg1RGRaa1FJUUpBRzBhdFVLcFZMcEF4MVg5SkRQMnh2ZjlDT1R5VEFrSkFUWHJsMkwyZG5aT0czYU5CMEFlS0dBclNFU29CbU9mMkVteFlPODhjV25wSkNzRGZ4L3g4bDc0OGFOZXExV2k2dFhyOGFRa0JBVGt1UXZsNTYzcDNHZ1hhcFdyVm9KVndIUURNU1hWK1lLcnZIQkZhbFVpaHMyYk1EczdHejg5Ny8vclJjNkFUd0pDVkJOaG1aOCtyZTFnNThJWU51MmJRYWRUb2ZyMXEwek9iTkNjVEJYZnZLWHFlM2J0eGVXQXBnd1ljSnFuVTZIZVhsNURTb0EvdXVlbnBjM3ZxT09GTUN5WmNzd096c2I1OHlaVTJZTnlXMU1BanQyN0VDbFVvbGJ0bXd4SVFHcXlkQ3lqRHp0aHhQNHQyelpndG5aMmZqZGQ5L2hpeSsrdU15YTRyTm56NTZER28wR0Z5OWUvSUFDNEMrVG5yZXZUd0hRZGVtQ0lnQ0pSTUlsSGI4YWJhN2dHaDlna1VxbCtNMDMzNkJTcWNTdnYvNWFzRVhBSnlHQnRtM2JjazFRcEFpTS85MjJiVnVyQmo4VkFRc0xDMDlxTkJwY3VIQ2hpUUlnTWpSWGZ2SjNYOXExYTRjU2lVU1lCTkN5WlV1dXdGTGZPOTJldCtldmNVTkNRdkR0dDkvRzNOeGNYTDE2OVEwaGJnTStLUW40K1Bod014NDFhWkVQQ1FsQkh4OGZxd2IvMzNGcGUralFvZHNxbFFvblRwejRnQUpvcUVieXZEemhoQXJWTFZ1MkZCNEI1T2Jtb2tRaTRXWWNLcnlSdkRKWGNQa0tZUFRvMGR4YXVXWExsbjNSeW94UEFwczNiMFlmSHg5dWl6WWtKSVRiYXZMeDhjSE5temRiTmZnUkVUdDM3anp3MEtGRG1KdWJpOG5KeWZVcUFIUGxKN1dwRTE3YXRtMkxFb2tFYzNOek1UTXpFeE1URXkyZkFPajZJbU1GWUJ4Y0lvSG43V2tMMERpNHZyNittSnViaXhrWkdkaTdkKzg1UW1rRmZsSVNHRDE2OUxMdDI3ZGpUazRPYnRxMENYMThmREF3TUJDbFVpa0dCZ2FpajQ4UGJ0cTBDYk95c25ENTh1VldDLzdxNm1yRDY2Ky9QcitzckF4emMzTlJvVkJ3eTFUS0MxSUE1c3BUbXFTTUZZQWdDY0JZQVpEc3RyVGd0bXJWQ2pkdTNJZzVPVG40eVNlZkdLd3g2UnNpQVc5dmIvVHg4VUZ2Yis5R0FYNktRMDVPemw2OVhvOXIxNjdsQ3RXV05ra1JYZ1N0QUlLQ2dremtGVzBGRWdrOGIwOXJLMkw2RGgwNm9GUXF4Vm16WnRFeW9NckZ4U1VlcmRUNEpMQng0MGFNam83R2pSczNOZ3J3SXlMNit2cDJPWDc4ZUhWK2ZwN2FBQ2tBQUNBQVNVUkJWRDUrOE1FSEtKVkt1V1kxcWdGUW5wZ3JUMmtMa0phcFFVRkJ3aU1BcFZLSkVvbUVLN0FRbzFsS2NHbUxKVGc0R0VORFExR3BWR0pXVmhZT0h6NTgwVysvL2ZaNll5RUJldTdHQVA2aW9xTGVzMmZQWG43Z3dBRlVLcFhZcmwwN3JnYkNmOFc0T1NjcFk3eUVoSVNnUkNKQnBWS0pHUmtad2lJQVVnQlVaYWF0UUhNRmx6eHRzUkREdG1yVkN0UFQwMUdwVk9LR0RSc3VObS9lUEJ5dDJJZ0V0bTNiaHBtWm1iaHMyVEtyQno4aW9yT3pjOFR4NDhldjBEc0NTUDZUUXJXMC9LVExRSUtDZ29SSkFNWUtnSnBNYUkxRlN1QjVlMko0WWxoNmVjbW9VYU5RcVZSaWRuWTJqaDgvUGhVQVBCb0JDU3hadEdnUjl1L2ZmNG0xZ3g4QUZGOTg4VVZhZVhrNUtwVktIREZpQlBmU0RlTU9TY29QYytVbjFhZ0lMNEpXQUZSbGJtaU5aUzVQREV2TGdMWnQyNkpVS3NYbHk1ZWpVcW5FM2J0MzN3a0lDT2lQVm00QTRCRVZGZFhQMnNrT0VURXNMR3pBcjcvK2VrZWxVdUh5NWN0TnhwM2tQeWtBYytjbnYwWVZHQmdvWEFVUUhCeHMwbWxHRE10dlEzMWVudjQrQlpsa1Z1dldyYkZObXphb1ZDb3hOemNYMDlMU2ZtcmF0R2w3WkNaNGs4dmxIUTRlUFBoTFNVa0pLcFZLYk5PbURkY0hRZktmSmlkTHlFOWp2QVFIQnd0TEFZd2ZQMzYxUnFQQm5Kd2NUZ0h3WlphNWdrdWVtSjVrRmpGdHk1WXRNU1VsQlhOeWNqQTNOeGMvK3VpakhHdHFEMjZNQmdBQm16WnR5djcrKys5UnFWUmlTa29LMTU5Q3lwVE9SbEJlbURzLytjdlR3TUJBek1uSndkMjdkMk9mUG4yRVF3QVNpWVM3R0pUMldVbCtFOU9aeTVNQ29HVUE5VnkzYnQwYXYvcnFLOHpKeWNIOC9IeDg3NzMzMXNKemZxa2xzNmNHZnYvbHk1ZXZPMzc4T09ibDVlSENoUXV4VmF0VzNCa1ZZL2xQK1dEdXZDUjhVSjlLbXpadFVDS1JDSk1BQWdJQ0hsQUFsaEJrOHZSNUtOalVkTkdoUXdkY3VYSWxLcFZLVktsVU9HWEtsRlFBOEdPUUVoVDQvUll2WHB6Njg4OC9ZMzUrUHE1Y3VaSzdYSVBXL2pRcFdXcGVrZ0lJQ0FnUXJnS29iNjFsekhUbTh2UTVhQmxBdFFCYWMwVkdSdUtxVmF0UXFWU2lXcTFtSkNCQThKODRjUUx6OC9OeDFhcFZHQkVSd2RXa2pQT1J4dC9TOHBLMnFGdTNiaTFjQmRDaVJRdE9YaHNIMjl4QkprOU15eWNCa2wwUkVSR01CS3dJL0xRY3BiNFVHbmZLQTB2SlMrTjdHYVJTS2JabzBVSllCS0JXcXpFN08vdWhDc0JTUFA4OFBNa3VZdDZJaUFoTVQwL0huSndjVktsVU9IbnlaRVlDQXBEOWVYbDVtSjZlem9HZjhwQUtmL3o3RUN3dEwva0tJRHM3RzNmdDJpVXNBaUFGd0wrRXd0S0NUWXhMYTBJK0NZU0hoek1TRUNENHc4UERUY0JQdFNnYVo3Nzh0eFJ2ZkRrTEtRQkJFb0JFSXVIYUxVbDJFZU5hbXFlZ0UvT1MvS0txTVNNQllZS2Y4by9HazVRb1h3RlltcWZsS09XZlZTZ0FmdFhWVWp6TkJJOGlnYkN3TUVZQ0FnQi9XRmpZWTRHZlh3T3dGRTg0c1FvRlVGL1RoU1Y3Q2o0eE1BMENJd0ZoZ3AvR2p4UW9YLzVicWpkdVRoT2NBbENwVkppVmxZWCsvdjdjdFZNMHMxcHkwR2xtYUlnRWFEQ0lCTEt6c3pFL1A1K1JnSVdCbnlhZGhzRFBWd0NXNWdrbmRGVFozOThmczdLeWNPZk9uY0lpQU9QQm9BS01wUWVma1lDd3dKK2JtMnRWNE9mdlJsRytDWklBL1B6ODZtMitvSWUwVkUvSlFwK1g1QmdkemFSQkNRME5aU1JnQWVDblYyalR1TkRNU2N0T0drYytDVmlxcHhvVU5hWDUrZmtKVndIUXBTRFVEQ1NVUVhnVUNRUUZCVEVTc0NEdzAzZ0lIZnowT2Fsd1NjOGxhQVhBNzhDaWg3UjBUOGxEbjV0a0dURXpJd0hMQWo4cFRWcHUwcmp4U2NEU1BiOGoxU29WQUNNQlpnejhEWHVyVUFDK3ZyNG1Db0F2eTRUaUtabm84OVBnRUVNSEJnWnlwd2daQ1R4NzhOT3BQb283NVJkTk1qUk9mQklRaXFmbEp1V1hyNit2Y0JVQVhRcEN6VUJDR3d4R0Fnejg1dkMwaTBIUEtSZ0NlT09OTjFibjUrZmpuajE3T0FYQTc4WG12NU5PS0o2U2k1NkRCb25PREFRRUJIQWtrSmFXaGxsWldaaVhsOGRJNENtQVB5MHRqUU0veFpueWlpWVhHaGMrQ1FqTjg4K2krUHI2NHA0OWUzREhqaDJZa0pBZ0hBS2d3VEp1QmhMcW9Ed3BDYlJ2Mzk2RUJONTk5MTFHQWs4SS9wOSsrZ21WU2lXbXBhVmgrL2J0R3dYNGpWL1VTcGVCU0NRU1lSS0FqNC9QQXozWnhvTWtWRS9KUnM5ai9JSk5SZ0xQRC93MHFkQTQ4RWxBcUo1L0JzWEh4MGY0Q29CdUJ4YjY0REFTWU9CL0hwNTJOYXhLQVpCY3MzWVNJT1p1MGFJRkk0R25BSDZLSStXUnRZT2Zmd0JOMEFxQWpnUlR0WllLSE5iaVNhN1JvQkZ6RzVPQVdDeG1KUEFQd0M4V2l4OEFQOFdYNGszeHQ3YThJcnpROHd1U0FMeTl2VTBPYU5BTTJkaEl3Ti9mSDhWaU1iWnIxNDZSd0dPQXYxMjdkaWdXaTlIZjM3OVJncDl3UW1jYnZMMjloYXNBNkVnd3JkMW8wS3pOVTFMUzRGR3kwaUQ2K2ZtaFdDekdrSkFRUmdJUEFYOUlTQWlLeFdLdWpad21ENG9ueFpkUEF0Ym1DUzlFZ29Ja0FDOHZMNU4yWUJyRXhrSUNKT09vbmRQSHh3ZkZZakcyYWRPbVBoTHdiV1RnOStXRHYwMmJOaWdXaTduYUVlVU54Ykd4Z0o5d1Fubmo1ZVVsWEFYZzUrZG53bWcwZU5idWFSRHB1YW1hNitucGlXS3hHSU9DZ2pnU3lNckt3b2tUSnk1cFRBVHd6VGZmTFBueHh4ODU4QWNGQmFGWUxFWlBUMCtUM1NPS0gxLytXN3VuNXlZbFpGVUtvTEdSQUg4WjRPYm1ocDZlbnJobXpScmN2WHMzTGxteUJBY05HdlJWWXlLQU45OTg4NnV0VzdkaVJrWUdybG16QmowOVBkSE56ZTJoOHIreDVZMVZLQUJmWDErdUlHWXM0NnpkR3hjQ2phdTVDb1VDdmJ5OE9QQXZYcndZKy9YcnR4UUFmQnJaRXNCbjVNaVJTemR2M3N5UmdKZVhGeW9VQ3BQZEkzNEJzTEhrRHowM3RkTUxrZ0JJenRHQklQNWFyckdBbnc1MGVIbDVvWmVYRjY1ZHU1WURmOSsrZlpjMXR2Vy9jUjBnT1RsNUdaSEEyclZydVJnWjUwMWpJd0hDQ2VXTnA2ZW44QlVBWDg1WnE2ZkJvNlNsdGIrUGp3OEQveE9RQUJVQ3FSWkE4YVQ0V25zZUVWNnNRZ0UwVk5CaDRHL2M0R2NrVUwrdnIzQXNXQVhnNCtQREZUU3NlZkFZK0JrSlBNMDhJcnpROHd1U0FJd0xPc1lkWGZTUTF1S0pzYW56ajhEdjdlM053UDhVU0lBNlNpbXVsRWNVZDJ2TEovNVpFb1ZDSVV3Q2VGaFRCd00vTTBZQ0RYdCs4NWdnQ2NERHc0TnJCemJlMTZWQkU3cW5KS1I5ZmdiKzUwc0NsRTk4TWhDNnAzd2kzSGg0ZUFoWEFkQ2cwWllPQXo4elJnS1A5clFGNk8zdExYd0ZRSjFkdEF5Z3dSS3FwNlFqbVVack5iYlAvM3o3QkNqdWxGZDhNaENxcDd3aTNBaEtBUmpmQ215c0FQaFZYR3NGLzdwMTZ6QWpJd09YTEZtQy9mcjFZK0IvQ2lRd2N1VElaVnUyYk1ITXpFeGN0MjVkb3lBQlkwVXBGb3VGZVMyNHU3dTdWU2tBU2k2U1o3UkdZK0EzTHduUU9OQXlVK2drd0ZjQTd1N3V3aVFBc1Zoc3d0VEdneU0wVCtURkI3K25weWNEdnhsSmdKck4rQ1RBVndSQzg4YkswbW9VQUoraEdmaVpNUko0MEZPZVdZVUNNQjRjNDBFUmlxZGtvalVaRFFxZDZtUGd0d3dTb0tZekdoK3FPZkhKUUNqZWVKSVJyQUp3YzNQakRnUVpEd29EUHpOR0FnMTd5amZDalp1YkcxTUFEUHpNR2hNSldJMENNRzRISmpCUmxkTlNQYTNCcUJEREIvL2F0V3NaK0MyUUJLaFBnRThDTkk0MHJwYWVmOFlIeWVnR0tVRVJnRnF0eHV6czdBY1VnQkFHNFZIZ1g3ZHVIV1ptWnVMU3BVc1orQzJFQkVhTkdyVnM2OWF0dUdmUG5nYVZnRkJJb0w1Q3MxZ3N4dXpzYk55MWE1ZXdDTURWMWRXa0dZZy9DSmJtaVhrcCtMUUdZK0FYTmduUU9OSzQwamhiYWg0U1RxZ0p5TlhWVlpnRVlLd0FqTmRrRFB6TUdBazhQQThKTDFhbEFQakJ0eFJQak12QWI1MGtRR2RTK0NSQTQyNXArVWlmenlvVUFKK0JMUzNvZlBCVHdkTER3NE9CM3dwSmdNYlhVa21BUG8veEpNUVVnQmxtZms5UFR3WitLeUlCVDAvUEJwY0Rsa1lDZ2xjQUdvMEdjM0p5VUN3V1A1SjV6ZTFwclVXZlQ2RlFvTE96TTY1WnN3YjM3Tm1EeTVZdFkrQVhNQWxzMjdZTnM3S3ljTTJhTmVqczdNeVJBSTAzZjVmQTNMNCtKU29XaXpFbkp3ZDM3OTR0TEFKd2NYRXhPUkJrNmNGV0tCUm9aMmVIUzVZc3dUMTc5dUNLRlN2d3BaZGVTZ2YyR20raGtvRGYyTEZqMDNiczJJSFoyZG00Wk1rU3RMT3plNEFFTEhWU29vTkFMaTR1d2lRQVMxWUFmTmxQMWRZcFU2Wmdkblkycmw2OUdwT1Rrek1CSUlCQlNkQWtFUER1dSs5bTdONjlHN096czNIS2xDa211MU1OTFFlWUFuaUtDcUNoWUp2TEU4UHl3UjhURTRQWjJkbTRkZXRXZk8rOTk0N2IyTmkwWlJBU3Z0bloyYlZkdEdqUjhUMTc5bUJPVGc3R3hNU1lLRlBLQThvTGMrY25QeThGclFEb1NEQVZBaTB0eUpRRTd1N3V1R1RKRXN6TXpNU3Z2dnJxamtLaDZOY0laa2RGY25MeVlBQlFXUHV6dG1qUm90LzI3ZHZ2WkdkbjQ3ZmZmc3NkVk9PVGdLVk1Ub1FYZDNkM1lTbUFDUk1tck5acXRhaFVLaHRVQVBTUTV2TDBPWXlEM0xkdlg4ekp5Y0cxYTlkaS8vNzlWd0tBaDdXdmo1Y3VYYnJ5MTE5L3hmZmZmMytsdGRjNUFNQmo0c1NKcVZsWldaaVRrNE1KQ1FrUFRFNldscC9HQ2tDcFZHSkdSZ1ltSmlZK1ZRS1FQa3MydUg3OU9yaTR1TURGaXhkQm9WREErZlBud2N2TEM4NmRPd2ZlM3Q1bThWNWVYbkQrL0hsUUtCUlFXVmtKcnE2dWNPWEtGUmcyYkJqVTF0YkNIMy84Y1ZHbjA2MUF4QXRncFNZU2lmd1hMMTQ4TXlFaElhV2lvZ0lTRWhMZXZILy92a2drRXZrajRsbHJmR1pFdk9EZzRCRFJvMGVQbDVzMmJlcjJ5aXV2Z0Y2dkJ6YzNONmlzckFSUFQwK0x5azhQRHcrNGNPRUN1TGk0d05XclY1OVpYTVRQTXVoT1RrNXc5ZXBWY0hkM2h3c1hMbkJCTmxkd3ZiMjk0Zno1OCtEcDZRbVZsWlhnN3U0T1Y2NWNnYzZkTzRPcnF5dmN1blVMaW91TE4vLzg4ODh4MWc3K3hNVEVsRE5uemtCTlRRM1UxdFpDVWxKU3lwUXBVMmFLUkNKL2EzMzJuSndjVjYxV3V4MEF3TVBEQStMaTR1RHk1Y3ZnN3U1dVFnS1drSjhYTGx3QWQzZDN1SHIxS2pnNU9RbVRBRWdCWExwMGladHhpV0hONVFuOENvVUNMbDI2Qk03T3poQVJFUUdJQ05ldVhidDc2TkNoM1lHQmdXc2FBL2pQblRzSGMrYk1nUXNYTGpRS0VuamhoUmQwZVhsNTJ3SGdIaUpDZUhnNE9EczdtK1NucDZlbldmUFR5OHZMSkQ5ZFhGemcrdlhyd2lNQWtVakVLUUEzTnpjVEJVQXl4eHkrc3JLU2sxZXVycTV3N2RvMWlJMk5oWnFhR3ZqUGYvNnovOGFORzM5WUsvaVhMRmt5TXlrcEtlWHMyYk53L3Z4NW1EOS9QaHcrZkJqbXo1OFBGeTllaFB2MzcwUGZ2bjFUM252dlBhc2xnVXVYTHYzKzMvLys5NEJZTEliWTJGaTRkdTBhdUxxNndvVUxGOEREdzRPYnBNeVpwNlFBM056Y09BVWdFb2xBSkJJSlV3RmN2bnpaSW9ONzVjb1ZhTnUyTGNqbGNyaHo1dzRjUFhxMHVMYTJ0dFJhd1c4ODgzLzIyV2R3OXV4WmNIQndnTE5uejhKbm4zMW1vZ1NzbFFTcXE2czNHUXlHRW9sRUFpNHVMdEM2ZFd1NGN1V0tSVTVTbHk5ZkZxNENNSzRCdUxtNW1SUUNLY2ptOE1iQmRYWjJCbTl2YjBCRXFLcXFnblBuemgyUVNDUXRyQjM4Q3hZc2dJcUtDbkJ5Y29KYnQyNkJrNU1UVkZSVXdJSUZDNnllQkd4c2JMcWZQbjM2b0V3bUF3QUFiMjl2Y0haMmhzdVhMNXNzQTh5WnB3cUZBaTVldkdpaUFBUmJBNkRnR2hjQ0tjam04QjRlSG5EeDRrVk8vb2VFaEFBaXdwMDdkMjZlUFh2MlRHTUEvK25UcDhIWjJSbHUzTGdCTGk0dWNPUEdEWEIyZG9iVHAwODNDaEk0ZlBqd2Z4RHhMd0NBa0pDUWVwY0I1c3hUS2dEU0pDVTRCVUJyRlVkSFJ5NjQvRUtMT2J3eHMxNjVjZ1djbkp6QTFkVVZFQkgrL1BQUDh3QlFiWTNnUDN2MkxKdzdkdzQrLy94enFLaW80SktLU05EVjFaVWo2NHFLQ3ZqODg4ODVFckRTbWtEVm5UdDN6b3ZGWW5CeGNRRW5KeWR1R1VCSzFkeDVldW5TSlc1OEhCMGRuMWtncE04d0FibVo1Y3FWS3hhbEFJejNWNTJjbkdnSmNCTUFhcXdaL0RUekUrZ3A2UzlmdnN6OW01VEE1NTkvRGpObnpnU0ZRZ0Y5Ky9aTitic0laUzE5QWpYVjFkVTNiRzF0T2ZLaldwVkNvYkNJUEhWM2QrZDJxYTVkdThZVkFaOTJJZkNaTmdMSjVmSjZGWUM1dkxIOEp3VmdhMnRMeGFHL0FLRE9Hc0ZQc3QvSnlja0UvQ1F6S2RtTTQwTExBU0tCcEtTa0ZQcjlWa0FDZGZmdTNic2pFb2xBSnBOeHRTcFhWMWU0ZVBFaXR3d3daNTdTTHRXVksxZEFMcGNMVHdFQUFOeThlYk5lZVhYaHdnV3plWGQzZDdoNDhTTEhyQktKaElDRDFnNStrdjNVbkdVTWZ2cDNZeUVCaVVRaUVvbEVJQmFMdWVYUGxTdFh1RW5DM0hsS3lvekdUVEExQUdPcElwZkx1YVNqclVCekJ0WER3OE5rYmVYazVBUjM3dHdCc1ZnTTl2YjI5cys2S1BvOHdKK1VsSlR5My8vK0Y4NmZQLy9FNEtmT001TEZ4aVJnM0Njd2RlcFVvZGNFSkgrUE45eTVjOGRFR1YyNmRNa2k4cFRJK1ByMTZ5Q1h5NTlaSDhCelZ3QVVYSE40S2dBYXI2MXUzYm9GWXJFWTVISzVDd0RJaEE1K212ay8rK3l6ZXNGUHoyOE1mbVBQcndrUUNYejIyV2N3YTlZc3JpWWdjQ1VnbGN2bHp0WFYxWERyMWkwVEJVQUswUkx5VkpBS2dGOERNQzZ3R0FmWEhONVk1cElDT0h2MkxJaEVJbkIwZFBRQ0FEdHJBUC84K2ZOTndFOEZUMHFxaHNCUDhhSDlaMnBDSVJLWVAzKyt5ZTZBVUpXQVdDeHUwcng1YzA5RWhQLys5NzhtQ3NDUzhwVGlML2dhQU1sS2tsZm1EQzdOZ0FTSzgrZlBnMGdrZ2laTm1qUVBEZzRPc2did1U1TVBnZi9hdFdzUGdQOWh5V2VzQkl4M1N5b3FLbUQrL1BudzBVY2ZDVm9KZE92V0xWZ2tFaldwcTZ1RGMrZk9jWEVpQldBSmVXcXN3QVRaQjJCY0F6QU9ycVVvQUVycTc3Ly9Ia1FpRWRqYjI0T2ZuMS9IZS9mdUZRdDF6ZisvZ3A5cUpNWks0TnExYXlaS2dFaUFhZ0w5K3ZWTGVmLzk5d1dqQkc3ZnZyMGhPRGk0NDcxNzkwQWtFa0Y1ZWJuSkpFVzFLblBuNlpVclYwd1V3TE9xQVR4dGM1azRjZUpxdlY2UEtwVUtSU0lSZHlrSTNXeENseHlZeTlNZGEzUmx1Wk9URTI3YXRBbno4L054d1lJRiswQUFGMk1BZ04rU0pVdFNmLzMxVjlUcGRMaCsvWG9NQ2dveWlUZTltSldlbCs2WGY5dzQwZmZUejlQdmMzRnhRWkZJaEVGQlFiaCsvWHBVcTlWWVVGQ0E3Ny8vZnFwQVl1ZXYwV2dPRkJVVjRabzFhOURKeWNra0graDV6WjJuaEJlS3QwcWx3dXpzYkV4S1NyTHNHNEdNQ2NEUjBkRWt1RSthaE04anVIUVJxRXFsd2gwN2R0eFRLQlRkR2p2NHJaa0VXclpzMmVQbm4zK3UwV2cwK0s5Ly9jc2tEeXhsa3FLNEUyNGNIUjJGUlFDRmhZVVdxd0FvdU1iSkhCSVNnaXFWQ25OemMzSHMyTEVycDA2ZDJ0cVN3WC95NU1sbkRuNXJKQUVBOFBqODg4OVhIeng0RUZVcUZiWnUzZnFCdUZuaUpDVTRCVkJZV0locXRkcGlGVUI5eTRCbHk1YWhXcTNHYmR1MlhYVjBkSXl5WlBBWEZCVGdoZzBibmpuNG40UUVObXpZZ0JxTkJ2VjZ2Y1dTZ0plWFYreUpFeWV1RnhRVTRMZmZmbXV4OHI4K0JhQldxekVuSndmNzl1MHJIQUlRaVVUbzdPeGNMOE9hMnhzbnNWZ3N4djc5KzZOYXJVYVZTb1dUSmsxYUJ3Q2VRZ0EveFplU2hXWU9QZ244cjU1K0gvMSsrbnZPenM2Q0lBRUE4RnEyYk5tV1E0Y09vVnF0eG43OStwbU12NlhtSjhWWGtBUWdsOHROZ3Z5MGsvSi9UV1pLWXBySkZpMWFSSUd1YXRPbXpjc00vTlpEQXZIeDhjTk9uVHAxVDZmVDRWZGZmZlZZeXNuYytVbWZUeTZYQzRjQVVsSlNWaGNWRmFGR283Rm9CY0JQWWljbkp3d0tDa0tWU29WYXJSWTNiZHIwSDdsY0htNEo0RDkxNmhUcTlYcXpndjlKU1VDcjFXSmhZU0ZPbXpiTjdDVGc0ZUVSOWNNUFAxVHMyN2NQOC9QenNVV0xGZy9JZjNvZVMxVUE5SzROU3ljQTU0a1RKM0lFWUtrS29DRVNjSFIweE5HalI2TkdvMEdkVG9lZmYvNjVSaXdXdDdRazhGTlNtQVA4ajBNQ1lySFlva2hBSnBPMXpzbkpLVHh5NUFocU5CcE1UazYyZVBEekZZQ1RreE5xTkJvcUFxWUJnTFBGRXNENDhlTlhFZ0hZMk5nMFdHaXhGTSt2QlRnNU9lSFhYMy9OeWRpUFAvNTRCd0FFUG1md3QxaTZkR21hTWZnREF3TzV6MWZmMnRXUzRpY1dpekV3TU5DRUJLWlBuNTRHQUMyZVp4d2xFa25MVFpzMlpmejQ0NDlFNkZ4aDJsTGkxNUEzVnFaMmRuWWNBU1FtSm41bnlRVGdORzdjdUVVR2d3RzFXaTNIYVB5dFFFc0pNbjhHbzgvcDdlMk42ZW5wcU5WcXNhaW9DRC8vL1BNc0d4dWI0T2VVdEszV3JGbXo3ZVRKazFoWVdJZ2JOMjU4SlBqTkZWZjZ1dzhqZ1kwYk42Sk9wME9Ed1lCejVzelpKaGFMV3oyUE9OcmIyNGZzMnJVcjc4U0pFMWhRVUlEcDZla21iOXQ5bUlLeWxMeWt6NmxRS0ZDcjFXSldWaFltSkNRc0FnQW5pMFMvcjYrdjQ2dXZ2anEvdUxnWXRWb3R1cm01UFpDMGxxb0ErRExXMTljWFY2OWVqVnF0RmcwR0EyN1lzR0cvbjU5ZnQ2dFhyMzc2TEJMMnI3LytXdCtpUll0T0dvMm0rTVNKRTZqWDYzSGp4bzJjN0xjMDhEOHVDUVFGQlptUXdPclZxMHU4dmIwNzM3NTllLzJ6aU9OdnYvMzJlcHMyYlhxVWxwWisvK09QUDNMZzkvSHhxWGY1WktrS3dEaU9ibTV1cU5WcU1TTWpBM3YyN0RuZjA5UFQwU0lKb0V1WExzMkhEUnMydmFTa0JMVmFMWGJvME1FazZKYkd0SThpQVI4ZkgweE5UZVdVUUZGUjBlVVJJMFpNZTlwTEFnQUlHRDE2OUx2LytjOS9MaHcrZkJoMU9oMm1wNmVqbjUrZlJZUC9jVW5BejgrUFUxUUdnd0VMQ3dzdkRobzBhREk4NVZldkEwRFF2LzcxcjVsbnpweTU5djMzMzZOT3A4TVZLMWFndDdlM29NQlA4YVRQR3hvYWlscXRGbmZ1M0lsZHVuU1pIaE1UMDl4U0NhQnAzNzU5eCszZHV4ZTFXaTFHUjBjL3NPWVNHZ2w0ZUhqZ3RHblRVS3ZWb2w2dngvMzc5K091WGJzT0pDUWtqQUdBd09ycWFzTS9TZGJhMnRvS0FBam8yN2Z2eU1MQ3d0TGZmdnNOOSs3ZGl6cWREai81NUJPdUtjVFN3Zis0Sk9EcDZZa3paODdrNG5qZ3dBSGN2bjM3dnA0OWU0NEdnSUIvR3NlLy92cHJQUUFFRGhreTVJMzkrL2NmT25YcUZOSUVOSG55Wk83ekNRMzhGRDlIUjBlTWpvNUdyVmFMMjdadHcram82SEVkTzNac2Fxa0VZQnNhR3RxN3JLd01kVG9kRGhreXBONnRRRXNMK3FOSVFDNlhZOCtlUFhIMzd0MmNsRDEwNkJCcXRkcGo0OGFObSt2dDdkMEpBRnBNblRxMWRXMXRiVVZEeVRwMTZ0VFdBTkRDeThzcjlzMDMzL3prNE1HRDM1ODVjd1lQSGp5SUJRVUZtSm1aaVFNR0RPQjJUK2p2V3pyNEgwVUN4bkZNVEV6RWpJd00xT2wwV0Z4Y2pIODM1aHdlTjI3Y25NZUo0OS9FNlFFQWdRRUJBVjJuVEpteTROaXhZeitlUG4wYTkrL2Zqd1VGQlRSVFBoQkhTd2MvUHc5cEMzRElrQ0dvMVdweDQ4YU5HQkFRMEx0ang0NjJUKzFVNmRNa2dNNmRPOHNPSERqUTJtQXdITHA3OTY3dGpoMDdZUGZ1M2R6TEoraG1HdVBiYUMzTjAvbDN1akhJMGRFUmJ0eTRBUTRPRGxCVFV3TnZ2dmttOU9yVkMyUXlHVWlsVW1qYXRDblkyOXZYM0x4NTgxUnBhZW14aW9xS1U5ZXVYVHRYVTFOejU4YU5HMzg2T1RrMWw4bGtkczdPenA0dFc3WnNuWkNRRU83bzZOajY5dTNiTmpkdTNJQzdkKzlDVFUwTkdBd0dTRTFOQlpGSUJMZHUzZUwrTG4wTytseVdIai82ZkErTFkxMWRIYVNrcEVEUG5qMUJLcFdDVENZRGUzdDdremllT1hQbXQydlhycDI3ZCsvZVg0aDRYeXdXUyt6czdKcTV1TGo0QkFjSHQrelJvMGQ0czJiTkFtL2R1aVc5ZWZNbVZGVlZ3ZDI3ZHlFL1B4ODJiTmdBTmpZMkQ0MmpwY2VQOE9MZzRBQkRodzZGNGNPSHc1a3paNnBUVWxJaU8zYnNlT3JBZ1FOUDVRWnI2Vk1tZ0xwOSsvWlYzYjU5KzZKVUt2WHo5ZldGbXpkdmdxT2pvOG05QUpZYS9JWklnQVpETHBmRG9rV0xZTWVPSGRDclZ5L28xNjhmT0RzN3c2MWJ0MlFTaWFSdGx5NWQydmJ1M1J0c2JXMUJLcFdDV0N3R1JBUkVoSnFhR3FpcXFvS2JOMi9DbFN0WG9LNnVEbTdjdUFFYWpRYTBXaTM4OGNjZjRPRGdZRUtXUWdQL28wakFPSTdmZlBNTjdOaXhBeElTRWlBeE1aSGVVc1RGc1Zldlh2WEc4ZDY5ZTFCVlZRVlhybHlCeXNwS1FFUzRmUGt5NU9mblExRlJFVlJXVm9KY0x1Y3VvNmt2amtMSlA3bGNEamR1M0FCZlgxK29xNnVEUC8vODh5SWlWc2ZFeE5RZE9IREE4bTRFcXEydHJRT0Fxa3VYTGxYNCtQajQrZmo0Z0lPRHd3TTNBMWx5OEIrSEJNNmZQdzlaV1Ztd2NlTkdpSW1KZ1RadDJrQmtaQ1MwYXRVSzdPd2F2bFdzdXJvYVRwMDZCWWNQSDRhVEowL0N3WU1Ib1huejV2RG5uMzgrTW1tRkF2NG5JWUUvL3ZnRGR1L2VEV3ZYcm4yaU9ONjVjd2QrK2VVWE9ITGtDSnc4ZVJJT0h6NE1jcmtjYnQyNkpYancxNmNBZkh4OG9LNnVEaTVmdmx3QkFGVjFkWFVXZlgyOXkxdHZ2Yld5c0xBUXRWb3QydG5aTmRoNVphbHJzSVpxQXZ3MUxUMlhvNk1qaWtRaWxNdmw2T25waVowN2Q4YTR1RGdjTUdBQXhzWEZZWmN1WGRESHh3ZWRuSnk0N3pQK2VmNWFuNzlXRlVxOEhsVVRlSkk0ZW5oNFlLZE9uVEF1TGc1NzkrNk5jWEZ4R0I4ZmoyNXViaWlYeTFFa0VuRUY1c2VObzFEaVZWOFRVRlpXRmc0WU1DRFZrdHVBYVJuUXJILy8vbThYRnhkalFVRUJ4c2JHbWd5T1VBYURUd0pQa3NRUDg0K2JyRUtMRTR2ajB5OEFpc1ZpakkyTnhZS0NBdHkyYlJ0MjdOang3ZWpvNkdZV1RRRHg4ZkUyQ29VaXRxU2twTGFnb0FDVGs1TWZPQk1ndEJtTlA1TTlLb2tmNWVuNytkVjlvYy80NW9walE2QVhhcDRabndKTVRrNUduVTZIcTFldnJuVjJkbzZOaW9xeXNXZ0NtREpsaWdRQUFyS3pzMC9xOVhwY3ZIZ3hpa1FpanJHRk9yUFI0RHdxaWZuSnpFL1NSeVdydFlLZnhmSEpGQUF0RnhjdlhveHF0Um8vLy96emt3QVFNSEhpUklsRkU4Q2tTWk5FQU9BMmZmcjBEVlFINERPYjBOZTBqMHJpeC9VTi9UNXJCVCtMNDVNcEFIZDNkOVJxdFppZG5ZM0Rody9mQUFCdTQ4ZVB0L3lyZ1dOalk1djE2ZFBuRFlQQmdIcTlIbnYxNnZYQTlXQkNUL2FHa3U2ZmVtc0hQWXZqa3hVQUhSMGRzVmV2WGxoUVVJQ2JOMi9HaUlpSTF5TWpJNXVCRUt4ang0NHllM3Y3ZGxxdDlycGVyOGNGQ3hiVXV3eXdsdVJub0dkeGZKcTFFWkwvQ3hZc1FKMU9oMHVYTHIxdVkyUFROaUlpUWhpdnJudnJyYmRFQU9DNVlNR0NMTG9lakgvS3lkcXEzTXd6L3pUdlZmRHc4RUMxV28xS3BSTGZlT09OTEFEd2ZQMzExMFVnRlBQeThtcWVtSmc0c2Fpb0NQVjZQZmJ2MzkvcWxnSE1NLytzNUgvLy92MVJyOWZqNXMyYk1Tb3FhcUpDb1dnT1FyS0JBd2ZLeEdKeDY5emMzTXJDd2tKTVMwc3pXUVl3RW1DZStmcWJmMFFpRWFhbHBhRldxOFd2di82NlVpUVN0VTVLU2hMV202c25USmdnQWdEWGQ5NTVKN1d3c0JDTGlvb3dKaWFHTFFPWVovNFI4ajhtSmdZTEN3c3hJeU1EQnc4ZW5Bb0FybVBHakJHQjBDdzZPdHJPejgrdnUxYXJyU29zTE1SNTgrWUp2aW1JZWVhZmRmUFB2SG56c0tDZ0FGZXVYRm5sN3U3ZVBTd3NUSEN2clFjQWdJa1RKNG9Cd0d2Ky9QbFplcjBlaTRxSzBOL2ZuOVVDbUdlK2diVy92NzgvRmhVVllYWjJOaFgvdk1hTUdTTUdvVnBVVkZUVHNMQ3dnUVVGQmJWRlJVVTRmLzc4eDdyWG5ubm1HeFA0YTZ1eVFnQUFDbXRKUkVGVTZmS1ArZlBubzE2dng5V3JWOWNHQmdZT0RBc0xhd3BDdG43OStra0F3R2Zod29XcXdzSkNOQmdNM0YyQlFybnBobm5tbjhmTlNSMDZkRUNEd1lBNU9UbjQ1cHR2cWdEQUp5RWhRUUpDdDhqSXlLWnQyN2J0cjlGbzdoVVZGZUdYWDM3NVFDMkFGUVNaYjh5RlA3bGNqbDkrK1NYcTlYcE1TMHU3NSsvdjN6ODBOTFFwV0lPOS92cnJZZ0R3bWpWcjFrNjlYbzhHZ3dIajQrTUZjMkVvODh3LzY0cy80K1BqMFdBd1lHWm1KbzRaTTJZbkFIaU5HalZLRE5aaUVSRVJUVHc4UE9LVlN1VjFlbEI3ZTN2V0Y4QjhvOS8zdDdlM3g4ek1UTlRwZExoNDhlTHJ6czdPOGUzYnQyOEMxbVJqeDQ0VkE0RHJxRkdqNWhZVUZLREJZTUFaTTJhd2dpRHpqYjd3TjJQR0RDd3FLc0l0VzdaZ1FrTENYQUJ3SFRGaWhCaXN6Zjd1WmdwTVRVMHRMeXdzeE9MaVl1elNwUXNyQ0RMZmFBdC9YYnAwUVlQQmdFcWxFbWZNbUZFT0FJRTllL2FVZ2JXYWg0ZEhzNkNnb0w1S3BmSzJ3V0RBakl3TTdzMHRqQVNZYjB6ZzkvYjJ4b3lNREN3b0tNRGx5NWZmOXZiMjd1dm01dFlNck5uK1hncTRqUmd4WWc2OUhHTHg0c1dDZXdrRzg4ei9yeTlMV2J4NE1Sb01CdHkwYVJNbUpDVE1BUUMzVjE1NVJReldib21KaVRJQThKODdkNjZxb0tBQWk0dUxjY0tFQ1ExdURUSVNZTjZhd0MrWHkzSENoQWxZWEZ5TUdSa1ptSktTb2dJQS94NDllc2lnc1ZoWVdGZ1RKeWVuOFBYcjE1OHFMQ3pFa3BJU0hEQmdnR0RlaGNjODgvLzBYWWtEQmd6QTR1Sml6TXZMdzA4Ly9mU1VnNE5EZUx0MjdacEFZN0l4WThhSVBEdzhIQUlDQXZwbFpHUmMvL3V0c2RpNWMyZEdBc3hiTGZnN2QrNk1lcjBlTlJvTkxscTA2THFYbDFjL056YzNoK0hEaDR1Z3NkbHJyNzBtOXZEd2NJNk5qUjJibTV0YlZWeGNqRHFkRHFPam94a0pNRzkxNEtlMy9PcjFla3hOVGExcTM3NzlPRGMzTitkR3NlNS9TRDFBQWdEdUw3MzAwdlRjM055YTR1SmkxR2cwR0JFUndVaUFlYXNCZjBSRUJHbzBHdTZnendzdnZEQURBTng3OU9naGdjWnVpWW1KVWdEd0hENTgrQ2Q1ZVhuM2k0dUxVYXZWWWx4Y0hDTUI1Z1VQL3JpNE9OUnF0VmhZV0locjFxeTUzNmRQbjA4QXdMTkhqeDVTWVBaLzFxZFBIeGtBZUkwWU1XS3VVcW04VDY4VzY5Mjc5d05uQnZnZGc0d01tTGVFVzR6NUx6TnhkSFRFM3IxN1kwRkJBZXIxZWx5elpzMzlwS1NrdVFEZzFhZ3EvazlLQW9NSEQ1NlpuWjE5cjdpNEdFdExTM0g0OE9HTUJKZ1hIUGlIRHgrT3BhV2xXRkJRZ09ucDZmZDY5ZW8xazRILzhVaEEwYU5IajBtN2QrKytiVEFZc0xTMEZHZk5tb1VLaGNMazNYRFc4aFpkNXEzanJjZVVsd3FGQW1mTm1vV2xwYVdvMFdodytmTGx0Mk5qWS8vMWQxNHo4RDhHQ1VnQndMVk5temJETm03Y2VGR3YxMk5wYVNtdVc3Y09RMEpDNm4xQlpHTjd4eDd6bHZGT1EvNExUVU5DUW5EZHVuVllVbEtDT1RrNXVIRGh3b3NCQVFIREFNQ1ZyZm1md0Y1OTlWV3h1N3U3bzRlSFI1ZXZ2dnFxWEsxV1kwbEpDZXAwT2h3elpvekpGZU1OdlNXV2tRRHp6M0xHTnk3MGlVUWlIRE5tRE9wME9qUVlETGhqeHc3ODRJTVB5bDFkWGJ1NHViazVOdXF0dnYrUkJKcktaTExXRXlkT1hMdG56NTVhV2hKODk5MTM2T3ZyKzBCdGdDa0M1cC9IakcrODF2ZjE5Y1h2dnZzT1MwdExVYXZWNHVyVnEydEhqQml4VmlxVnRuWnpjMnZLd1A4LzJPalJvMFY5K3ZTeEJRQ3Y2T2pvMTllc1dYTmVvOUZnYVdrcEZoVVY0UnR2dk1FTnpxUGVHOC9JZ1BsL0FucitqRTk1NXVibWhtKzg4UVlXRlJWaGNYRXhabVptNHNLRkM4K0hob2ErL25leHo3WlJkdmc5cTdxQXU3dTdvNk9qWStSYmI3MjFQVE16ODM1UlVSSHUzYnNYYzNKeWNPVElrU2lWU2g5WUZqd3VHVEJTWUM4aWZSam9qZVcrVkNyRmtTTkhZazVPRHU3ZHV4YzFHZzJ1V2JQbS91alJvN2M3T0RoRXVybTVPZmJzMlpPdDk1KzJqUm8xU2hRYUdtb0hBRjZob2FISjMzenp6UTlLcFJLTGk0czVJbmo1NVpkTnJsdDZIREo0RkNrd2I1MmVQLzRQQXozOS81ZGZmcGtEdmw2dnh5MWJ0dURzMmJPUGg0U0VqQVFBNy9idDI5dTk4c29yYk5aL2xwYVFrQ0R4OFBCd0FJQ2dQbjM2ekVwTlRmMGpMeStQSTRLOHZEeDgrKzIzMGRYVmxhc1I4SmNIZkRKb2lCU1l0MDdQSDNkK1hsQytPRG82b3F1cks3Nzk5dHVZbDVlSGUvZnV4Y0xDUXR5K2ZUdCsrZVdYZjd6d3dndXpBQ0RJM2QzZG9XZlBucXl0OTNuM0RIaDRlRGpaMmRtMTdkKy8vL3lWSzFlZXk4bkpRWVBCZ0h2MzdzVjkrL2JoTjk5OGd3TUhEa1I3ZTN1T0RJalJHeUtGaHNpQmVXSDdoc2FaOG9EeXd0SFJFZTN0N1hIZ3dJSDR6VGZmNEw1OSs3QzB0QlIxT2gxdTNib1ZGeTVjZUs1UG56N3piVzF0MjNwNGVEajE3dDJiN2UyYnMwaVlsSlJrQXdET01wa3N1RnUzYmg4c1hMandoMTI3ZHFGT3A4UFMwbEpPcm4zeHhSYzRiTmd3ZEhOejR5NGZvVUYvWEZKZ1h0aWVEM2J5Y3JrYzNkemNjTml3WWZqRkYxK2dYcS9Idlh2M2N1ZjIxNjlmajNQbXpEbmVxVk9uRDJReVdUQUFPUGZwMDhkbTVNaVJncGI3SW1zaWdpdFhya2lQSGozYTlNS0ZDMDRoSVNGUm5UdDNIaFliRzl2SDFkWFYwY0hCQVd4c2JFQXMvcjhkbVhQbnpzRXZ2L3dDdi83NksxeTllaFZPbkRnQnQyL2ZobXZYcm9GY0xvZGJ0MjZCZzRNRDNMcDFDK1J5T2R5OGVaTjVnWG9hUndjSEI3aDU4eVk0T3p0RHMyYk5JQ1FrQkZ4Y1hLQk5tellRSEJ3TTN0N2VBQUJRVzFzTGQrL2VoYXRYcjhMVnExZHZsSmVYYTh2THkzZjk4c3N2aHp3OFBLNkhoNGYvNWVycVdydGx5eFlVT202c3NsaVJsSlFrdlhqeG91MlJJMGVhMmRqWXVFWkVSSFNQaW9ycTA3NTkrM2hYVjFmMzVzMmJnNTJkSFVpbFVoQ0x4UndwMU5iV1FtVmxKVnk0Y0FIKyt1c3Z1SEhqQmxSWFY4UHQyN2ZCeHNZRzd0Mjd4N3pBZkxObXpjRFcxaFljSFIyaGFkT21vRkFvd05QVEU2VFMveXZTMTlYVndmMzc5K0hldlh2dzExOS93YzJiTitIcTFhdVhmdnJwcDdJZmZ2aEJlL1RvMGVKNzkrNWRqWWlJK05QZDNiMWFvOUhVV2hOV3JMcGFPWGJzV05IUm8wZWxGeTlldEt1c3JHd0tBQTV0MjdidDRPbnBHUmNWRlJYcDUrZlhybm56NWg1MmRuWmdiMjhQdHJhMklKVktRU0tSZ0Znc0JwRklCQ0tSaUNNSVpzS3l1cm82UUVUdWk4QmVVMU1EZCs3Y2didDM3MEoxZFRYY3VuWHI0dG16WjM4NmR1elk0Y3JLeXYwblRwdzREZ0MzRkFyRlh3cUZvaW9zTEt4Mnc0WU5hSTB4YWpUYkZhKy8vcnJvMHFWTGtnc1hMdGljUDMvZTl2ejU4MDBBd043UjBkSFozOSsvcFZ3dUQ1VEw1ZjdCd2NHQnpzN09paVpObWpTM3NiRnBhbU5qMDFRaWtkZ3lPQW5UYW10cnErL2R1L2RYZFhYMVgzZnUzUG56MnJWckYwNmRPblg2NXMyYloyL2V2SG42N05tei83bHg0OFkxQUxqajVlVjExOHZMcTFxaFVOeHpkM2UvdjNidFdyVDIrRFRhL2NxSkV5ZUtMbHk0SUs2c3JKU0lSQ0xwdVhQbnBPZk9uWk1CZ0MwQXlBQkFDZ0NTdjc5RWpUbFdBamI4Kyt2KzMxKzFBRkFEQU5YZTN0NDFQajQrdFhWMWRiV2VucDczUFQwOTY5TFMwckN4QllnbE5jOVNVbEpFWXJGWUpCS0pSUHYzN3hlSlJDSkFSQllyNFJJQUFBREV4Y1VoSW1KZFhSMDJScUF6WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Smd4WThhTUdUTm16Q3paL2ovZXp2MEVWc0UwandBQUFBQkpSVTVFcmtKZ2dnPT0nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0b29sdGlwO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG4iLCIvLyByZXF1aXJlKCdmcycpLnJlYWRkaXJTeW5jKF9fZGlybmFtZSArICcvJykuZm9yRWFjaChmdW5jdGlvbihmaWxlKSB7XG4vLyAgICAgaWYgKGZpbGUubWF0Y2goLy4rXFwuanMvZykgIT09IG51bGwgJiYgZmlsZSAhPT0gX19maWxlbmFtZSkge1xuLy8gXHR2YXIgbmFtZSA9IGZpbGUucmVwbGFjZSgnLmpzJywgJycpO1xuLy8gXHRtb2R1bGUuZXhwb3J0c1tuYW1lXSA9IHJlcXVpcmUoJy4vJyArIGZpbGUpO1xuLy8gICAgIH1cbi8vIH0pO1xuXG4vLyBTYW1lIGFzXG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy5qc1wiKTtcbnV0aWxzLnJlZHVjZSA9IHJlcXVpcmUoXCIuL3JlZHVjZS5qc1wiKTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHV0aWxzO1xuIiwidmFyIHJlZHVjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc21vb3RoID0gNTtcbiAgICB2YXIgdmFsdWUgPSAndmFsJztcbiAgICB2YXIgcmVkdW5kYW50ID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0aWYgKGEgPCBiKSB7XG5cdCAgICByZXR1cm4gKChiLWEpIDw9IChiICogMC4yKSk7XG5cdH1cblx0cmV0dXJuICgoYS1iKSA8PSAoYSAqIDAuMikpO1xuICAgIH07XG4gICAgdmFyIHBlcmZvcm1fcmVkdWNlID0gZnVuY3Rpb24gKGFycikge3JldHVybiBhcnI7fTtcblxuICAgIHZhciByZWR1Y2UgPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmICghYXJyLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGFycjtcblx0fVxuXHR2YXIgc21vb3RoZWQgPSBwZXJmb3JtX3Ntb290aChhcnIpO1xuXHR2YXIgcmVkdWNlZCAgPSBwZXJmb3JtX3JlZHVjZShzbW9vdGhlZCk7XG5cdHJldHVybiByZWR1Y2VkO1xuICAgIH07XG5cbiAgICB2YXIgbWVkaWFuID0gZnVuY3Rpb24gKHYsIGFycikge1xuXHRhcnIuc29ydChmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGFbdmFsdWVdIC0gYlt2YWx1ZV07XG5cdH0pO1xuXHRpZiAoYXJyLmxlbmd0aCAlIDIpIHtcblx0ICAgIHZbdmFsdWVdID0gYXJyW35+KGFyci5sZW5ndGggLyAyKV1bdmFsdWVdO1x0ICAgIFxuXHR9IGVsc2Uge1xuXHQgICAgdmFyIG4gPSB+fihhcnIubGVuZ3RoIC8gMikgLSAxO1xuXHQgICAgdlt2YWx1ZV0gPSAoYXJyW25dW3ZhbHVlXSArIGFycltuKzFdW3ZhbHVlXSkgLyAyO1xuXHR9XG5cblx0cmV0dXJuIHY7XG4gICAgfTtcblxuICAgIHZhciBjbG9uZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0dmFyIHRhcmdldCA9IHt9O1xuXHRmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuXHQgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gdGFyZ2V0O1xuICAgIH07XG5cbiAgICB2YXIgcGVyZm9ybV9zbW9vdGggPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmIChzbW9vdGggPT09IDApIHsgLy8gbm8gc21vb3RoXG5cdCAgICByZXR1cm4gYXJyO1xuXHR9XG5cdHZhciBzbW9vdGhfYXJyID0gW107XG5cdGZvciAodmFyIGk9MDsgaTxhcnIubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBsb3cgPSAoaSA8IHNtb290aCkgPyAwIDogKGkgLSBzbW9vdGgpO1xuXHQgICAgdmFyIGhpZ2ggPSAoaSA+IChhcnIubGVuZ3RoIC0gc21vb3RoKSkgPyBhcnIubGVuZ3RoIDogKGkgKyBzbW9vdGgpO1xuXHQgICAgc21vb3RoX2FycltpXSA9IG1lZGlhbihjbG9uZShhcnJbaV0pLCBhcnIuc2xpY2UobG93LGhpZ2grMSkpO1xuXHR9XG5cdHJldHVybiBzbW9vdGhfYXJyO1xuICAgIH07XG5cbiAgICByZWR1Y2UucmVkdWNlciA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHBlcmZvcm1fcmVkdWNlO1xuXHR9XG5cdHBlcmZvcm1fcmVkdWNlID0gY2Jhaztcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnJlZHVuZGFudCA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHJlZHVuZGFudDtcblx0fVxuXHRyZWR1bmRhbnQgPSBjYmFrO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2UudmFsdWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHZhbHVlO1xuXHR9XG5cdHZhbHVlID0gdmFsO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2Uuc21vb3RoID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBzbW9vdGg7XG5cdH1cblx0c21vb3RoID0gdmFsO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVkdWNlO1xufTtcblxudmFyIGJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWQgPSByZWR1Y2UoKVxuXHQudmFsdWUoJ3N0YXJ0Jyk7XG5cbiAgICB2YXIgdmFsdWUyID0gJ2VuZCc7XG5cbiAgICB2YXIgam9pbiA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb2JqZWN0JyA6IHtcbiAgICAgICAgICAgICAgICAnc3RhcnQnIDogb2JqMS5vYmplY3RbcmVkLnZhbHVlKCldLFxuICAgICAgICAgICAgICAgICdlbmQnICAgOiBvYmoyW3ZhbHVlMl1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndmFsdWUnICA6IG9iajJbdmFsdWUyXVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICAvLyB2YXIgam9pbiA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7IHJldHVybiBvYmoxIH07XG5cbiAgICByZWQucmVkdWNlciggZnVuY3Rpb24gKGFycikge1xuXHR2YXIgdmFsdWUgPSByZWQudmFsdWUoKTtcblx0dmFyIHJlZHVuZGFudCA9IHJlZC5yZWR1bmRhbnQoKTtcblx0dmFyIHJlZHVjZWRfYXJyID0gW107XG5cdHZhciBjdXJyID0ge1xuXHQgICAgJ29iamVjdCcgOiBhcnJbMF0sXG5cdCAgICAndmFsdWUnICA6IGFyclswXVt2YWx1ZTJdXG5cdH07XG5cdGZvciAodmFyIGk9MTsgaTxhcnIubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChyZWR1bmRhbnQgKGFycltpXVt2YWx1ZV0sIGN1cnIudmFsdWUpKSB7XG5cdFx0Y3VyciA9IGpvaW4oY3VyciwgYXJyW2ldKTtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIHJlZHVjZWRfYXJyLnB1c2ggKGN1cnIub2JqZWN0KTtcblx0ICAgIGN1cnIub2JqZWN0ID0gYXJyW2ldO1xuXHQgICAgY3Vyci52YWx1ZSA9IGFycltpXS5lbmQ7XG5cdH1cblx0cmVkdWNlZF9hcnIucHVzaChjdXJyLm9iamVjdCk7XG5cblx0Ly8gcmVkdWNlZF9hcnIucHVzaChhcnJbYXJyLmxlbmd0aC0xXSk7XG5cdHJldHVybiByZWR1Y2VkX2FycjtcbiAgICB9KTtcblxuICAgIHJlZHVjZS5qb2luID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gam9pbjtcblx0fVxuXHRqb2luID0gY2Jhaztcblx0cmV0dXJuIHJlZDtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnZhbHVlMiA9IGZ1bmN0aW9uIChmaWVsZCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB2YWx1ZTI7XG5cdH1cblx0dmFsdWUyID0gZmllbGQ7XG5cdHJldHVybiByZWQ7XG4gICAgfTtcblxuICAgIHJldHVybiByZWQ7XG59O1xuXG52YXIgbGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVkID0gcmVkdWNlKCk7XG5cbiAgICByZWQucmVkdWNlciAoIGZ1bmN0aW9uIChhcnIpIHtcblx0dmFyIHJlZHVuZGFudCA9IHJlZC5yZWR1bmRhbnQoKTtcblx0dmFyIHZhbHVlID0gcmVkLnZhbHVlKCk7XG5cdHZhciByZWR1Y2VkX2FyciA9IFtdO1xuXHR2YXIgY3VyciA9IGFyclswXTtcblx0Zm9yICh2YXIgaT0xOyBpPGFyci5sZW5ndGgtMTsgaSsrKSB7XG5cdCAgICBpZiAocmVkdW5kYW50IChhcnJbaV1bdmFsdWVdLCBjdXJyW3ZhbHVlXSkpIHtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cblx0ICAgIHJlZHVjZWRfYXJyLnB1c2ggKGN1cnIpO1xuXHQgICAgY3VyciA9IGFycltpXTtcblx0fVxuXHRyZWR1Y2VkX2Fyci5wdXNoKGN1cnIpO1xuXHRyZWR1Y2VkX2Fyci5wdXNoKGFyclthcnIubGVuZ3RoLTFdKTtcblx0cmV0dXJuIHJlZHVjZWRfYXJyO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZDtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSByZWR1Y2U7XG5tb2R1bGUuZXhwb3J0cy5saW5lID0gbGluZTtcbm1vZHVsZS5leHBvcnRzLmJsb2NrID0gYmxvY2s7XG5cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaXRlcmF0b3IgOiBmdW5jdGlvbihpbml0X3ZhbCkge1xuXHR2YXIgaSA9IGluaXRfdmFsIHx8IDA7XG5cdHZhciBpdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIGkrKztcblx0fTtcblx0cmV0dXJuIGl0ZXI7XG4gICAgfSxcblxuICAgIHNjcmlwdF9wYXRoIDogZnVuY3Rpb24gKHNjcmlwdF9uYW1lKSB7IC8vIHNjcmlwdF9uYW1lIGlzIHRoZSBmaWxlbmFtZVxuXHR2YXIgc2NyaXB0X3NjYXBlZCA9IHNjcmlwdF9uYW1lLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuXHR2YXIgc2NyaXB0X3JlID0gbmV3IFJlZ0V4cChzY3JpcHRfc2NhcGVkICsgJyQnKTtcblx0dmFyIHNjcmlwdF9yZV9zdWIgPSBuZXcgUmVnRXhwKCcoLiopJyArIHNjcmlwdF9zY2FwZWQgKyAnJCcpO1xuXG5cdC8vIFRPRE86IFRoaXMgcmVxdWlyZXMgcGhhbnRvbS5qcyBvciBhIHNpbWlsYXIgaGVhZGxlc3Mgd2Via2l0IHRvIHdvcmsgKGRvY3VtZW50KVxuXHR2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcblx0dmFyIHBhdGggPSBcIlwiOyAgLy8gRGVmYXVsdCB0byBjdXJyZW50IHBhdGhcblx0aWYoc2NyaXB0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gc2NyaXB0cykge1xuXHRcdGlmKHNjcmlwdHNbaV0uc3JjICYmIHNjcmlwdHNbaV0uc3JjLm1hdGNoKHNjcmlwdF9yZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjcmlwdHNbaV0uc3JjLnJlcGxhY2Uoc2NyaXB0X3JlX3N1YiwgJyQxJyk7XG5cdFx0fVxuICAgICAgICAgICAgfVxuXHR9XG5cdHJldHVybiBwYXRoO1xuICAgIH0sXG5cbiAgICBkZWZlcl9jYW5jZWwgOiBmdW5jdGlvbiAoY2JhaywgdGltZSkge1xuXHR2YXIgdGljaztcblxuXHR2YXIgZGVmZXJfY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgY2xlYXJUaW1lb3V0KHRpY2spO1xuXHQgICAgdGljayA9IHNldFRpbWVvdXQoY2JhaywgdGltZSk7XG5cdH07XG5cblx0cmV0dXJuIGRlZmVyX2NhbmNlbDtcbiAgICB9XG59O1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbnZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xudmFyIGVuc2VtYmxSZXN0QVBJID0gcmVxdWlyZShcInRudC5lbnNlbWJsXCIpO1xuXG4vLyBBIHByZWRlZmluZWQgdHJhY2sgZm9yIGdlbmVzXG52YXIgZGF0YV9nZW5lID0gZnVuY3Rpb24gKCkge1xuLy9ib2FyZC50cmFjay5kYXRhLmdlbmUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgdHJhY2sgPSBib2FyZC50cmFjay5kYXRhKCk7XG4gICAgLy8gLmluZGV4KFwiSURcIik7XG5cbiAgICBib2FyZC50cmFjay5kYXRhLnJldHJpZXZlci5lbnNlbWJsID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc3VjY2VzcyA9IFtmdW5jdGlvbiAoKSB7fV07XG5cdHZhciBlbmRwb2ludDtcblx0dmFyIGVSZXN0ID0gZW5zZW1ibFJlc3RBUEkoKTtcblx0dmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uIChvYmopIHtcblx0ICAgIHZhciBkYXRhX3BhcmVudCA9IHRoaXM7XG5cdCAgICAvLyBPYmplY3QgaGFzIGxvYyBhbmQgYSBwbHVnLWluIGRlZmluZWQgY2FsbGJhY2tcblx0ICAgIHZhciBsb2MgPSBvYmoubG9jO1xuXHQgICAgdmFyIHBsdWdpbl9jYmFrID0gb2JqLm9uX3N1Y2Nlc3M7XG5cdCAgICBlUmVzdC5jYWxsKHtcblx0XHR1cmw6IGVSZXN0LnVybFt1cGRhdGVfdHJhY2suZW5kcG9pbnQoKV0obG9jKSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiAocmVzcCkge1xuXHRcdCAgICBkYXRhX3BhcmVudC5lbGVtZW50cyhyZXNwKTtcblxuXHRcdCAgICAvLyBVc2VyIGRlZmluZWRcblx0XHQgICAgZm9yICh2YXIgaT0wOyBpPHN1Y2Nlc3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdHN1Y2Nlc3NbaV0ocmVzcCk7XG5cdFx0ICAgIH1cblxuXHRcdCAgICAvLyBwbHVnLWluIGRlZmluZWRcblx0XHQgICAgcGx1Z2luX2NiYWsoKTtcblx0XHR9XG5cdCAgICB9KTtcblx0fTtcblx0YXBpanMgKHVwZGF0ZV90cmFjaylcblx0ICAgIC5nZXRzZXQgKCdlbmRwb2ludCcpO1xuXG5cdC8vIFRPRE86IFdlIGRvbid0IGhhdmUgYSB3YXkgb2YgcmVzZXR0aW5nIHRoZSBzdWNjZXNzIGFycmF5XG5cdC8vIFRPRE86IFNob3VsZCB0aGlzIGFsc28gYmUgaW5jbHVkZWQgaW4gdGhlIHN5bmMgcmV0cmlldmVyP1xuXHQvLyBTdGlsbCBub3Qgc3VyZSB0aGlzIGlzIHRoZSBiZXN0IG9wdGlvbiB0byBzdXBwb3J0IG1vcmUgdGhhbiBvbmUgY2FsbGJhY2tcblx0dXBkYXRlX3RyYWNrLnN1Y2Nlc3MgPSBmdW5jdGlvbiAoY2IpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBzdWNjZXNzO1xuXHQgICAgfVxuXHQgICAgc3VjY2Vzcy5wdXNoIChjYik7XG5cdCAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xuXHR9O1xuXG5cdHJldHVybiB1cGRhdGVfdHJhY2s7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgdXBkYXRlciA9IGJvYXJkLnRyYWNrLmRhdGEucmV0cmlldmVyLmVuc2VtYmwoKVxuICAgICAgICAuZW5kcG9pbnQoXCJyZWdpb25cIilcbiAgICAvLyBUT0RPOiBJZiBzdWNjZXNzIGlzIGRlZmluZWQgaGVyZSwgbWVhbnMgdGhhdCBpdCBjYW4ndCBiZSB1c2VyLWRlZmluZWRcbiAgICAvLyBpcyB0aGF0IGdvb2Q/IGVub3VnaD8gQVBJP1xuICAgIC8vIFVQREFURTogTm93IHN1Y2Nlc3MgaXMgYmFja2VkIHVwIGJ5IGFuIGFycmF5LiBTdGlsbCBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgb3B0aW9uXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKGdlbmVzKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKGdlbmVzW2ldLnN0cmFuZCA9PT0gLTEpIHtcblx0XHQgICAgZ2VuZXNbaV0uZGlzcGxheV9sYWJlbCA9IFwiPFwiICsgZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICBnZW5lc1tpXS5kaXNwbGF5X2xhYmVsID0gZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZSArIFwiPlwiO1xuXHRcdH1cblx0ICAgIH1cblx0fSk7XG5cbiAgICByZXR1cm4gdHJhY2sudXBkYXRlKHVwZGF0ZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkYXRhX2dlbmU7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgbGF5b3V0ID0gcmVxdWlyZShcIi4vbGF5b3V0LmpzXCIpO1xudmFyIGJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcblxudG50X2ZlYXR1cmVfZ2VuZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcblx0LmxheW91dChib2FyZC50cmFjay5sYXlvdXQuZmVhdHVyZSgpKVxuXHQuaW5kZXgoZnVuY3Rpb24gKGQpIHtcblx0ICAgIHJldHVybiBkLmlkO1xuXHR9KTtcblxuICAgIC8vIHZhciB0b29sdGlwID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICB2YXIgdG9vbHRpcCA9IGJvYXJkLnRvb2x0aXAudGFibGUoKTtcbiAgICAvLyAgICAgdmFyIGdlbmVfdG9vbHRpcCA9IGZ1bmN0aW9uKGdlbmUpIHtcbiAgICAvLyAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAvLyAgICAgICAgIG9iai5oZWFkZXIgPSB7XG4gICAgLy8gICAgICAgICAgICAgbGFiZWwgOiBcIkhHTkMgU3ltYm9sXCIsXG4gICAgLy8gICAgICAgICAgICAgdmFsdWUgOiBnZW5lLmV4dGVybmFsX25hbWVcbiAgICAvLyAgICAgICAgIH07XG4gICAgLy8gICAgICAgICBvYmoucm93cyA9IFtdO1xuICAgIC8vICAgICAgICAgb2JqLnJvd3MucHVzaCgge1xuICAgIC8vICAgICAgICAgICAgIGxhYmVsIDogXCJOYW1lXCIsXG4gICAgLy8gICAgICAgICAgICAgdmFsdWUgOiBcIjxhIGhyZWY9Jyc+XCIgKyBnZW5lLklEICArIFwiPC9hPlwiXG4gICAgLy8gICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgIG9iai5yb3dzLnB1c2goIHtcbiAgICAvLyAgICAgICAgICAgICBsYWJlbCA6IFwiR2VuZSBUeXBlXCIsXG4gICAgLy8gICAgICAgICAgICAgdmFsdWUgOiBnZW5lLmJpb3R5cGVcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgb2JqLnJvd3MucHVzaCgge1xuICAgIC8vICAgICAgICAgICAgIGxhYmVsIDogXCJMb2NhdGlvblwiLFxuICAgIC8vICAgICAgICAgICAgIHZhbHVlIDogXCI8YSBocmVmPScnPlwiICsgZ2VuZS5zZXFfcmVnaW9uX25hbWUgKyBcIjpcIiArIGdlbmUuc3RhcnQgKyBcIi1cIiArIGdlbmUuZW5kICArIFwiPC9hPlwiXG4gICAgLy8gICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgIG9iai5yb3dzLnB1c2goIHtcbiAgICAvLyAgICAgICAgICAgICBsYWJlbCA6IFwiU3RyYW5kXCIsXG4gICAgLy8gICAgICAgICAgICAgdmFsdWUgOiAoZ2VuZS5zdHJhbmQgPT09IDEgPyBcIkZvcndhcmRcIiA6IFwiUmV2ZXJzZVwiKVxuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICBvYmoucm93cy5wdXNoKCB7XG4gICAgLy8gICAgICAgICAgICAgbGFiZWwgOiBcIkRlc2NyaXB0aW9uXCIsXG4gICAgLy8gICAgICAgICAgICAgdmFsdWUgOiBnZW5lLmRlc2NyaXB0aW9uXG4gICAgLy8gICAgICAgICB9KTtcblxuICAgIC8vICAgICAgICAgdG9vbHRpcC5jYWxsKHRoaXMsIG9iaik7XG4gICAgLy8gICAgIH07XG5cbiAgICAvLyAgICAgcmV0dXJuIGdlbmVfdG9vbHRpcDtcbiAgICAvLyB9O1xuXG5cbiAgICBmZWF0dXJlLmNyZWF0ZShmdW5jdGlvbiAobmV3X2VsZW1zLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90O1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQpXG5cdCAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnRyYW5zaXRpb24oKVxuXHQgICAgLmR1cmF0aW9uKDUwMClcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdGlmIChkLmNvbG9yID09PSB1bmRlZmluZWQpIHtcblx0XHQgICAgcmV0dXJuIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIHJldHVybiBkLmNvbG9yXG5cdFx0fVxuXHQgICAgfSk7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9uYW1lXCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCkgKyAyNTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG5cdFx0ICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWxcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gXCJcIlxuXHRcdH1cblx0ICAgIH0pXG5cdCAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcIm5vcm1hbFwiKVxuXHQgICAgLnRyYW5zaXRpb24oKVxuXHQgICAgLmR1cmF0aW9uKDUwMClcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdCAgICB9KTtcdCAgICBcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlcihmdW5jdGlvbiAoZ2VuZXMpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0Z2VuZXNcblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KTtcblxuXHRnZW5lc1xuXHQgICAgLnNlbGVjdChcInRleHRcIilcblx0ICAgIC50cmFuc2l0aW9uKClcblx0ICAgIC5kdXJhdGlvbig1MDApXG5cdCAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgMjU7XG5cdCAgICB9KVxuXHQgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG5cdFx0ICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyKGZ1bmN0aW9uIChnZW5lcywgeFNjYWxlKSB7XG5cdGdlbmVzLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG5cdCAgICB9KTtcblxuXHRnZW5lcy5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcbiAgICB9KTtcblxuICAgIC8vIGFwaWpzIChmZWF0dXJlKVxuICAgIC8vIFx0Lm1ldGhvZCAoe1xuICAgIC8vIFx0ICAgIHRvb2x0aXAgOiB0b29sdGlwXG4gICAgLy8gXHR9KTtcblxuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZmVhdHVyZV9nZW5lO1xuIiwidmFyIHRudF9yZXN0ID0gcmVxdWlyZShcInRudC5lbnNlbWJsXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgdG50X2JvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbnRudF9ib2FyZC50cmFjay5sYXlvdXQuZ2VuZSA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcbnRudF9ib2FyZC50cmFjay5mZWF0dXJlLmdlbmUgPSByZXF1aXJlKFwiLi9mZWF0dXJlLmpzXCIpO1xuXG50bnRfYm9hcmRfZ2Vub21lID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCJcblxuICAgIC8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBlbnNfcmUgPSAvXkVOU1xcdytcXGQrJC87XG4gICAgdmFyIGVSZXN0ID0gdG50X3Jlc3QoKTtcbiAgICB2YXIgY2hyX2xlbmd0aDtcbiAgICBcbiAgICAvLyBWYXJzIGV4cG9zZWQgaW4gdGhlIEFQSVxuICAgIHZhciBjb25mID0ge1xuXHRnZW5lICAgICAgICAgICA6IHVuZGVmaW5lZCxcblx0eHJlZl9zZWFyY2ggICAgOiBmdW5jdGlvbiAoKSB7fSxcblx0ZW5zZ2VuZV9zZWFyY2ggOiBmdW5jdGlvbiAoKSB7fSxcblx0Y29udGV4dCAgICAgICAgOiAwXG4gICAgfTtcblxuICAgIHZhciBnZW5lO1xuICAgIHZhciBsaW1pdHMgPSB7XG4gICAgICAgIGxlZnQgOiAwLFxuXHRyaWdodCA6IHVuZGVmaW5lZCxcblx0em9vbV9vdXQgOiBlUmVzdC5saW1pdHMucmVnaW9uLFxuXHR6b29tX2luICA6IDIwMFxuICAgIH07XG5cblxuICAgIC8vIFdlIFwiaW5oZXJpdFwiIGZyb20gYm9hcmRcbiAgICB2YXIgZ2Vub21lX2Jyb3dzZXIgPSB0bnRfYm9hcmQoKTtcblxuICAgIC8vIFRoZSBsb2NhdGlvbiBhbmQgYXhpcyB0cmFja1xuICAgIHZhciBsb2NhdGlvbl90cmFjayA9IHRudF9ib2FyZC50cmFjaygpXG5cdC5oZWlnaHQoMjApXG5cdC5iYWNrZ3JvdW5kX2NvbG9yKFwid2hpdGVcIilcblx0LmRhdGEodG50X2JvYXJkLnRyYWNrLmRhdGEuZW1wdHkoKSlcblx0LmRpc3BsYXkodG50X2JvYXJkLnRyYWNrLmZlYXR1cmUubG9jYXRpb24oKSk7XG5cbiAgICB2YXIgYXhpc190cmFjayA9IHRudF9ib2FyZC50cmFjaygpXG5cdC5oZWlnaHQoMjApXG5cdC5iYWNrZ3JvdW5kX2NvbG9yKFwid2hpdGVcIilcblx0LmRhdGEodG50X2JvYXJkLnRyYWNrLmRhdGEuZW1wdHkoKSlcblx0LmRpc3BsYXkodG50X2JvYXJkLnRyYWNrLmZlYXR1cmUuYXhpcygpKTtcblxuICAgIGdlbm9tZV9icm93c2VyXG5cdC5hZGRfdHJhY2sobG9jYXRpb25fdHJhY2spXG5cdC5hZGRfdHJhY2soYXhpc190cmFjayk7XG5cbiAgICAvLyBEZWZhdWx0IGxvY2F0aW9uOlxuICAgIGdlbm9tZV9icm93c2VyXG5cdC5zcGVjaWVzKFwiaHVtYW5cIilcblx0LmNocig3KVxuXHQuZnJvbSgxMzk0MjQ5NDApXG5cdC50bygxNDE3ODQxMDApO1xuXG4gICAgLy8gV2Ugc2F2ZSB0aGUgc3RhcnQgbWV0aG9kIG9mIHRoZSAncGFyZW50JyBvYmplY3RcbiAgICBnZW5vbWVfYnJvd3Nlci5fc3RhcnQgPSBnZW5vbWVfYnJvd3Nlci5zdGFydDtcblxuICAgIC8vIFdlIGhpamFjayBwYXJlbnQncyBzdGFydCBtZXRob2RcbiAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbiAod2hlcmUpIHtcblx0aWYgKHdoZXJlICE9PSB1bmRlZmluZWQpIHtcblx0ICAgIGlmICh3aGVyZS5nZW5lICE9PSB1bmRlZmluZWQpIHtcblx0XHRnZXRfZ2VuZSh3aGVyZSk7XG5cdFx0cmV0dXJuO1xuXHQgICAgfSBlbHNlIHtcblx0XHRpZiAod2hlcmUuc3BlY2llcyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHdoZXJlLnNwZWNpZXMgPSBnZW5vbWVfYnJvd3Nlci5zcGVjaWVzKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgZ2Vub21lX2Jyb3dzZXIuc3BlY2llcyh3aGVyZS5zcGVjaWVzKTtcblx0XHR9XG5cdFx0aWYgKHdoZXJlLmNociA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHdoZXJlLmNociA9IGdlbm9tZV9icm93c2VyLmNocigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0ICAgIGdlbm9tZV9icm93c2VyLmNocih3aGVyZS5jaHIpO1xuXHRcdH1cblx0XHRpZiAod2hlcmUuZnJvbSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHdoZXJlLmZyb20gPSBnZW5vbWVfYnJvd3Nlci5mcm9tKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgZ2Vub21lX2Jyb3dzZXIuZnJvbSh3aGVyZS5mcm9tKVxuXHRcdH1cblx0XHRpZiAod2hlcmUudG8gPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICB3aGVyZS50byA9IGdlbm9tZV9icm93c2VyLnRvKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgZ2Vub21lX2Jyb3dzZXIudG8od2hlcmUudG8pO1xuXHRcdH1cblx0ICAgIH1cblx0fSBlbHNlIHsgLy8gXCJ3aGVyZVwiIGlzIHVuZGVmIHNvIGxvb2sgZm9yIGdlbmUgb3IgbG9jXG5cdCAgICBpZiAoZ2Vub21lX2Jyb3dzZXIuZ2VuZSgpICE9PSB1bmRlZmluZWQpIHtcblx0XHRnZXRfZ2VuZSh7IHNwZWNpZXMgOiBnZW5vbWVfYnJvd3Nlci5zcGVjaWVzKCksXG5cdFx0XHQgICBnZW5lICAgIDogZ2Vub21lX2Jyb3dzZXIuZ2VuZSgpXG5cdFx0XHQgfSk7XG5cdFx0cmV0dXJuO1xuXHQgICAgfSBlbHNlIHtcblx0XHR3aGVyZSA9IHt9O1xuXHRcdHdoZXJlLnNwZWNpZXMgPSBnZW5vbWVfYnJvd3Nlci5zcGVjaWVzKCksXG5cdFx0d2hlcmUuY2hyICAgICA9IGdlbm9tZV9icm93c2VyLmNocigpLFxuXHRcdHdoZXJlLmZyb20gICAgPSBnZW5vbWVfYnJvd3Nlci5mcm9tKCksXG5cdFx0d2hlcmUudG8gICAgICA9IGdlbm9tZV9icm93c2VyLnRvKClcblx0ICAgIH1cblx0fVxuXG5cdGdlbm9tZV9icm93c2VyLnJpZ2h0IChmdW5jdGlvbiAoZG9uZSkge1xuXHQgICAgLy8gR2V0IHRoZSBjaHJvbW9zb21lIGxlbmd0aCBhbmQgdXNlIGl0IGFzIHRoZSAncmlnaHQnIGxpbWl0XG5cblx0ICAgIGdlbm9tZV9icm93c2VyLnpvb21faW4gKGxpbWl0cy56b29tX2luKTtcblx0ICAgIGdlbm9tZV9icm93c2VyLnpvb21fb3V0IChsaW1pdHMuem9vbV9vdXQpO1xuXG5cdCAgICBlUmVzdC5jYWxsKHt1cmwgOiBlUmVzdC51cmwuY2hyX2luZm8gKHtzcGVjaWVzIDogd2hlcmUuc3BlY2llcyxcblx0XHRcdFx0XHRcdCAgIGNociAgICAgOiB3aGVyZS5jaHJcblx0XHRcdFx0XHRcdCAgfSksXG5cdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24gKHJlc3ApIHtcblx0XHRcdCAgICBkb25lKHJlc3AubGVuZ3RoKTtcblx0XHRcdH1cblx0XHQgICAgICAgfSk7XG5cdH0pO1xuXHRnZW5vbWVfYnJvd3Nlci5fc3RhcnQoKTtcbiAgICB9O1xuXG4gICAgIHZhciBob21vbG9ndWVzID0gZnVuY3Rpb24gKGVuc0dlbmUsIGNhbGxiYWNrKSAge1xuXHRlUmVzdC5jYWxsKHt1cmwgOiBlUmVzdC51cmwuaG9tb2xvZ3VlcyAoe2lkIDogZW5zR2VuZX0pLFxuXHRcdCAgICBzdWNjZXNzIDogZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0dmFyIGhvbW9sb2d1ZXMgPSByZXNwLmRhdGFbMF0uaG9tb2xvZ2llcztcblx0XHRcdGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHQgICAgdmFyIGhvbW9sb2d1ZXNfb2JqID0gc3BsaXRfaG9tb2xvZ3Vlcyhob21vbG9ndWVzKVxuXHRcdFx0ICAgIGNhbGxiYWNrKGhvbW9sb2d1ZXNfb2JqKTtcblx0XHRcdH1cblx0XHQgICAgfVxuXHRcdCAgIH0pO1xuICAgIH1cblxuICAgIHZhciBpc0Vuc2VtYmxHZW5lID0gZnVuY3Rpb24odGVybSkge1xuXHRpZiAodGVybS5tYXRjaChlbnNfcmUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZ2V0X2dlbmUgPSBmdW5jdGlvbiAod2hlcmUpIHtcblx0aWYgKGlzRW5zZW1ibEdlbmUod2hlcmUuZ2VuZSkpIHtcblx0ICAgIGdldF9lbnNHZW5lKHdoZXJlLmdlbmUpXG5cdH0gZWxzZSB7XG5cdCAgICBlUmVzdC5jYWxsKHt1cmwgOiBlUmVzdC51cmwueHJlZiAoeyBzcGVjaWVzIDogd2hlcmUuc3BlY2llcyxcblx0XHRcdFx0XHRcdG5hbWUgICAgOiB3aGVyZS5nZW5lIFxuXHRcdFx0XHRcdCAgICAgIH1cblx0XHRcdFx0XHQgICAgICksXG5cdFx0XHRzdWNjZXNzIDogZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0ICAgIHJlc3AgPSByZXNwLmZpbHRlcihmdW5jdGlvbihkKSB7XG5cdFx0XHRcdHJldHVybiAhZC5pZC5pbmRleE9mKFwiRU5TXCIpO1xuXHRcdFx0ICAgIH0pO1xuXHRcdFx0ICAgIGlmIChyZXNwWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uZi54cmVmX3NlYXJjaChyZXNwKTtcblx0XHRcdFx0Z2V0X2Vuc0dlbmUocmVzcFswXS5pZClcblx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHRnZW5vbWVfYnJvd3Nlci5zdGFydCgpO1xuXHRcdFx0ICAgIH1cblx0XHRcdH1cblx0XHQgICAgICAgfVxuXHRcdCAgICAgICk7XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGdldF9lbnNHZW5lID0gZnVuY3Rpb24gKGlkKSB7XG5cdGVSZXN0LmNhbGwoe3VybCAgICAgOiBlUmVzdC51cmwuZ2VuZSAoe2lkIDogaWR9KSxcblx0XHQgICAgc3VjY2VzcyA6IGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdGNvbmYuZW5zZ2VuZV9zZWFyY2gocmVzcCk7XG5cblx0XHRcdHZhciBleHRyYSA9IH5+KChyZXNwLmVuZCAtIHJlc3Auc3RhcnQpICogKGNvbmYuY29udGV4dC8xMDApKTtcblx0XHRcdGdlbm9tZV9icm93c2VyXG5cdFx0XHQgICAgLnNwZWNpZXMocmVzcC5zcGVjaWVzKVxuXHRcdFx0ICAgIC5jaHIocmVzcC5zZXFfcmVnaW9uX25hbWUpXG5cdFx0XHQgICAgLmZyb20ocmVzcC5zdGFydCAtIGV4dHJhKVxuXHRcdFx0ICAgIC50byhyZXNwLmVuZCArIGV4dHJhKTtcblxuXHRcdFx0Z2Vub21lX2Jyb3dzZXIuc3RhcnQoIHsgc3BlY2llcyA6IHJlc3Auc3BlY2llcyxcblx0XHRcdFx0XHQgIGNociAgICAgOiByZXNwLnNlcV9yZWdpb25fbmFtZSxcblx0XHRcdFx0XHQgIGZyb20gICAgOiByZXNwLnN0YXJ0IC0gZXh0cmEsXG5cdFx0XHRcdFx0ICB0byAgICAgIDogcmVzcC5lbmQgKyBleHRyYVxuXHRcdFx0XHRcdH0gKTtcblx0XHQgICAgfVxuXHRcdCAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc3BsaXRfaG9tb2xvZ3VlcyA9IGZ1bmN0aW9uIChob21vbG9ndWVzKSB7XG5cdHZhciBvcnRob1BhdHQgPSAvb3J0aG9sb2cvO1xuXHR2YXIgcGFyYVBhdHQgPSAvcGFyYWxvZy87XG5cblx0dmFyIG9ydGhvbG9ndWVzID0gaG9tb2xvZ3Vlcy5maWx0ZXIoZnVuY3Rpb24oZCl7cmV0dXJuIGQudHlwZS5tYXRjaChvcnRob1BhdHQpfSk7XG5cdHZhciBwYXJhbG9ndWVzICA9IGhvbW9sb2d1ZXMuZmlsdGVyKGZ1bmN0aW9uKGQpe3JldHVybiBkLnR5cGUubWF0Y2gocGFyYVBhdHQpfSk7XG5cblx0cmV0dXJuIHsnb3J0aG9sb2d1ZXMnIDogb3J0aG9sb2d1ZXMsXG5cdFx0J3BhcmFsb2d1ZXMnICA6IHBhcmFsb2d1ZXN9O1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMoZ2Vub21lX2Jyb3dzZXIpXG5cdC5nZXRzZXQgKGNvbmYpO1xuXG4gICAgYXBpLm1ldGhvZCAoe1xuXHRzdGFydCAgICAgIDogc3RhcnQsXG5cdGhvbW9sb2d1ZXMgOiBob21vbG9ndWVzXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZ2Vub21lX2Jyb3dzZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfYm9hcmRfZ2Vub21lO1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbmJvYXJkLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2dlbm9tZVwiKTtcbmJvYXJkLnRyYWNrLmxheW91dC5mZWF0dXJlID0gcmVxdWlyZShcIi4vbGF5b3V0XCIpO1xuYm9hcmQudHJhY2suZmVhdHVyZS5nZW5lID0gcmVxdWlyZShcIi4vZmVhdHVyZVwiKTtcbmJvYXJkLnRyYWNrLmRhdGEuZ2VuZSA9IHJlcXVpcmUoXCIuL2RhdGFcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGJvYXJkO1xuXG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIFRoZSBvdmVybGFwIGRldGVjdG9yIHVzZWQgZm9yIGdlbmVzXG52YXIgZ2VuZV9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgbWF4X3Nsb3RzO1xuXG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGNvbmYgPSB7XG5cdGhlaWdodCAgIDogMTUwLFxuXHRzY2FsZSAgICA6IHVuZGVmaW5lZFxuICAgIH07XG5cbiAgICB2YXIgY29uZl9ybyA9IHtcblx0ZWxlbWVudHMgOiBbXVxuICAgIH07XG5cbiAgICB2YXIgc2xvdF90eXBlcyA9IHtcblx0J2V4cGFuZGVkJyAgIDoge1xuXHQgICAgc2xvdF9oZWlnaHQgOiAzMCxcblx0ICAgIGdlbmVfaGVpZ2h0IDogMTAsXG5cdCAgICBzaG93X2xhYmVsICA6IHRydWVcblx0fSxcblx0J2NvbGxhcHNlZCcgOiB7XG5cdCAgICBzbG90X2hlaWdodCA6IDEwLFxuXHQgICAgZ2VuZV9oZWlnaHQgOiA3LFxuXHQgICAgc2hvd19sYWJlbCAgOiBmYWxzZVxuXHR9XG4gICAgfTtcbiAgICB2YXIgY3VycmVudF9zbG90X3R5cGUgPSAnZXhwYW5kZWQnO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgZ2VuZXNfbGF5b3V0ID0gZnVuY3Rpb24gKG5ld19nZW5lcywgc2NhbGUpIHtcblxuXHQvLyBXZSBtYWtlIHN1cmUgdGhhdCB0aGUgZ2VuZXMgaGF2ZSBuYW1lXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbmV3X2dlbmVzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAobmV3X2dlbmVzW2ldLmV4dGVybmFsX25hbWUgPT09IG51bGwpIHtcblx0XHRuZXdfZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZSA9IFwiXCI7XG5cdCAgICB9XG5cdH1cblxuXHRtYXhfc2xvdHMgPSB+fihjb25mLmhlaWdodCAvIHNsb3RfdHlwZXMuZXhwYW5kZWQuc2xvdF9oZWlnaHQpIC0gMTtcblxuXHRpZiAoc2NhbGUgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgZ2VuZXNfbGF5b3V0LnNjYWxlKHNjYWxlKTtcblx0fVxuXG5cdHNsb3Rfa2VlcGVyKG5ld19nZW5lcywgY29uZl9yby5lbGVtZW50cyk7XG5cdHZhciBuZWVkZWRfc2xvdHMgPSBjb2xsaXRpb25fZGV0ZWN0b3IobmV3X2dlbmVzKTtcblx0aWYgKG5lZWRlZF9zbG90cyA+IG1heF9zbG90cykge1xuXHQgICAgY3VycmVudF9zbG90X3R5cGUgPSAnY29sbGFwc2VkJztcblx0fSBlbHNlIHtcblx0ICAgIGN1cnJlbnRfc2xvdF90eXBlID0gJ2V4cGFuZGVkJztcblx0fVxuXG5cdGNvbmZfcm8uZWxlbWVudHMgPSBuZXdfZ2VuZXM7XG4gICAgfTtcblxuICAgIHZhciBnZW5lX3Nsb3QgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiBzbG90X3R5cGVzW2N1cnJlbnRfc2xvdF90eXBlXTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbGxpdGlvbl9kZXRlY3RvciA9IGZ1bmN0aW9uIChnZW5lcykge1xuXHR2YXIgZ2VuZXNfcGxhY2VkID0gW107XG5cdHZhciBnZW5lc190b19wbGFjZSA9IGdlbmVzO1xuXHR2YXIgbmVlZGVkX3Nsb3RzID0gMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGdlbmVzW2ldLnNsb3QgPiBuZWVkZWRfc2xvdHMgJiYgZ2VuZXNbaV0uc2xvdCA8IG1heF9zbG90cykge1xuXHRcdG5lZWRlZF9zbG90cyA9IGdlbmVzW2ldLnNsb3RcbiAgICAgICAgICAgIH1cblx0fVxuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXNfdG9fcGxhY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5lc19ieV9zbG90ID0gc29ydF9nZW5lc19ieV9zbG90KGdlbmVzX3BsYWNlZCk7XG5cdCAgICB2YXIgdGhpc19nZW5lID0gZ2VuZXNfdG9fcGxhY2VbaV07XG5cdCAgICBpZiAodGhpc19nZW5lLnNsb3QgIT09IHVuZGVmaW5lZCAmJiB0aGlzX2dlbmUuc2xvdCA8IG1heF9zbG90cykge1xuXHRcdGlmIChzbG90X2hhc19zcGFjZSh0aGlzX2dlbmUsIGdlbmVzX2J5X3Nsb3RbdGhpc19nZW5lLnNsb3RdKSkge1xuXHRcdCAgICBnZW5lc19wbGFjZWQucHVzaCh0aGlzX2dlbmUpO1xuXHRcdCAgICBjb250aW51ZTtcblx0XHR9XG5cdCAgICB9XG4gICAgICAgICAgICB2YXIgc2xvdCA9IDA7XG4gICAgICAgICAgICBPVVRFUjogd2hpbGUgKHRydWUpIHtcblx0XHRpZiAoc2xvdF9oYXNfc3BhY2UodGhpc19nZW5lLCBnZW5lc19ieV9zbG90W3Nsb3RdKSkge1xuXHRcdCAgICB0aGlzX2dlbmUuc2xvdCA9IHNsb3Q7XG5cdFx0ICAgIGdlbmVzX3BsYWNlZC5wdXNoKHRoaXNfZ2VuZSk7XG5cdFx0ICAgIGlmIChzbG90ID4gbmVlZGVkX3Nsb3RzKSB7XG5cdFx0XHRuZWVkZWRfc2xvdHMgPSBzbG90O1xuXHRcdCAgICB9XG5cdFx0ICAgIGJyZWFrO1xuXHRcdH1cblx0XHRzbG90Kys7XG5cdCAgICB9XG5cdH1cblx0cmV0dXJuIG5lZWRlZF9zbG90cyArIDE7XG4gICAgfTtcblxuICAgIHZhciBzbG90X2hhc19zcGFjZSA9IGZ1bmN0aW9uIChxdWVyeV9nZW5lLCBnZW5lc19pbl90aGlzX3Nsb3QpIHtcblx0aWYgKGdlbmVzX2luX3RoaXNfc2xvdCA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0fVxuXHRmb3IgKHZhciBqID0gMDsgaiA8IGdlbmVzX2luX3RoaXNfc2xvdC5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIHN1YmpfZ2VuZSA9IGdlbmVzX2luX3RoaXNfc2xvdFtqXTtcblx0ICAgIGlmIChxdWVyeV9nZW5lLmlkID09PSBzdWJqX2dlbmUuaWQpIHtcblx0XHRjb250aW51ZTtcblx0ICAgIH1cbiAgICAgICAgICAgIHZhciB5X2xhYmVsX2VuZCA9IHN1YmpfZ2VuZS5kaXNwbGF5X2xhYmVsLmxlbmd0aCAqIDggKyBjb25mLnNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7IC8vIFRPRE86IEl0IG1heSBiZSBiZXR0ZXIgdG8gaGF2ZSBhIGZpeGVkIGZvbnQgc2l6ZSAoaW5zdGVhZCBvZiB0aGUgaGFyZGNvZGVkIDE2KT9cbiAgICAgICAgICAgIHZhciB5MSAgPSBjb25mLnNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeTIgID0gY29uZi5zY2FsZShzdWJqX2dlbmUuZW5kKSA+IHlfbGFiZWxfZW5kID8gY29uZi5zY2FsZShzdWJqX2dlbmUuZW5kKSA6IHlfbGFiZWxfZW5kO1xuXHQgICAgdmFyIHhfbGFiZWxfZW5kID0gcXVlcnlfZ2VuZS5kaXNwbGF5X2xhYmVsLmxlbmd0aCAqIDggKyBjb25mLnNjYWxlKHF1ZXJ5X2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHgxID0gY29uZi5zY2FsZShxdWVyeV9nZW5lLnN0YXJ0KTtcbiAgICAgICAgICAgIHZhciB4MiA9IGNvbmYuc2NhbGUocXVlcnlfZ2VuZS5lbmQpID4geF9sYWJlbF9lbmQgPyBjb25mLnNjYWxlKHF1ZXJ5X2dlbmUuZW5kKSA6IHhfbGFiZWxfZW5kO1xuICAgICAgICAgICAgaWYgKCAoKHgxIDwgeTEpICYmICh4MiA+IHkxKSkgfHxcblx0XHQgKCh4MSA+IHkxKSAmJiAoeDEgPCB5MikpICkge1xuXHRcdHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdmFyIHNsb3Rfa2VlcGVyID0gZnVuY3Rpb24gKGdlbmVzLCBwcmV2X2dlbmVzKSB7XG5cdHZhciBwcmV2X2dlbmVzX3Nsb3RzID0gZ2VuZXMyc2xvdHMocHJldl9nZW5lcyk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHByZXZfZ2VuZXNfc2xvdHNbZ2VuZXNbaV0uaWRdICE9PSB1bmRlZmluZWQpIHtcblx0XHRnZW5lc1tpXS5zbG90ID0gcHJldl9nZW5lc19zbG90c1tnZW5lc1tpXS5pZF07XG4gICAgICAgICAgICB9XG5cdH1cbiAgICB9O1xuXG4gICAgdmFyIGdlbmVzMnNsb3RzID0gZnVuY3Rpb24gKGdlbmVzX2FycmF5KSB7XG5cdHZhciBoYXNoID0ge307XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXNfYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5lID0gZ2VuZXNfYXJyYXlbaV07XG4gICAgICAgICAgICBoYXNoW2dlbmUuaWRdID0gZ2VuZS5zbG90O1xuXHR9XG5cdHJldHVybiBoYXNoO1xuICAgIH1cblxuICAgIHZhciBzb3J0X2dlbmVzX2J5X3Nsb3QgPSBmdW5jdGlvbiAoZ2VuZXMpIHtcblx0dmFyIHNsb3RzID0gW107XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tnZW5lc1tpXS5zbG90XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0c2xvdHNbZ2VuZXNbaV0uc2xvdF0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNsb3RzW2dlbmVzW2ldLnNsb3RdLnB1c2goZ2VuZXNbaV0pO1xuXHR9XG5cdHJldHVybiBzbG90cztcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChnZW5lc19sYXlvdXQpXG5cdC5nZXRzZXQgKGNvbmYpXG5cdC5nZXQgKGNvbmZfcm8pXG5cdC5tZXRob2QgKHtcblx0ICAgIGdlbmVfc2xvdCA6IGdlbmVfc2xvdFxuXHR9KTtcblxuICAgIHJldHVybiBnZW5lc19sYXlvdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBnZW5lX2xheW91dDtcbiJdfQ==

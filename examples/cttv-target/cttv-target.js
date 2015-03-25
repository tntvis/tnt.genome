var cttv_genome_browser = function() {
    "use strict";

    // Display elements options that can be overridden by setters
    // (so they are exposed in the API)
    var show_options = true;
    var show_title   = false;
    var show_links   = true;
    var title   = "";

    var path = tnt.utils.script_path("cttv-target.js");

    // div_ids to display different elements
    // They have to be set dynamically because the IDs contain the div_id of the main element containing the plug-in
    var div_id;

    var fgColor = "#586471";
    var bgColor = "#c6dcec"

    var gBrowser;

    var gBrowserTheme = function(gB, div) {
	// Set the different #ids for the html elements (needs to be lively because they depend on the div_id)
	set_div_id(div);

	gBrowser = gB;

	// We set the original data so we can always come back
	// The values are set when the core plug-in is about to start
	var orig = {};

	// The Options pane
	var opts_pane = d3.select(div)
	    .append("div")
	    .attr("class", "tnt_options_pane")
	    .style("display", function() {
		if (show_options) {
		    return "block"
		} else {
		    return "none"
		}
	    });

	var left_button = opts_pane
	    .append("i")
	    .attr("title", "go left")
	    .attr("class", "fa fa-arrow-circle-left fa-2x")
	    .on("click", gBrowserTheme.left);

	var zoomIn_button = opts_pane
	    .append("i")
	    .attr("title", "zoom in")
	    .attr("class", "fa fa-search-plus fa-2x")
	    .on("click", gBrowserTheme.zoomIn);

	var zoomOut_button = opts_pane
	    .append("i")
	    .attr("title", "zoom out")
	    .attr("class", "fa fa-search-minus fa-2x")
	    .on("click", gBrowserTheme.zoomOut);

	var right_button = opts_pane
	    .append("i")
	    .attr("title", "go right")
	    .attr("class", "fa fa-arrow-circle-right fa-2x")
	    .on("click", gBrowserTheme.right);
	
	var origLabel = opts_pane
	    .append("i")
	    .attr("title", "reload location")
	    .attr("class", "fa fa-refresh fa-lt")
	    .on("click", function () {
		gBrowser.start(orig)
	    });

	var browser_title = d3.select(div)
	    .append("h1")
	    .text(title)
	    .style("color", gBrowserTheme.foreground_color())
	    .style("display", function(){
		if (show_title) {
		    return "auto"
		} else {
		    return "none"
		}
	    });

	/////////////////////////////////////////
	// Here we have to include the browser //
	/////////////////////////////////////////

	// The Browser div
	// We set up the origin:
	if (gBrowser.gene() !== undefined) {
	    orig = {
		species : gBrowser.species(),
		gene    : gBrowser.gene()
	    };
	} else {
	    orig = {
		species : gBrowser.species(),
		chr     : gBrowser.chr(),
		from    : gBrowser.from(),
		to      : gBrowser.to()
	    }
	}

	var gene_track = tnt.board.track()
	    .height(200)
	    .background_color(gBrowserTheme.background_color())
	    .display(tnt.board.track.feature.gene()
		     .foreground_color(gBrowserTheme.foreground_color())
		    )
	    .data(tnt.board.track.data.gene());

	gene_track
	    .display()
	    //.on_click(gene_track.display().tooltip());

	gBrowser(div);
	gBrowser.add_track(gene_track);

	// The GeneInfo Panel
	d3.select(div).select(".tnt_groupDiv")
	    .append("div")
	    .attr("class", "ePeek_gene_info")
	    .attr("id", "tnt_" + div_id + "_gene_info") // Both needed?
	    .style("width", gBrowser.width() + "px");

	// Links div
	var links_pane = d3.select(div)
	    .append("div")
	    .attr("class", "tnt_links_pane")
	    .style("display", function() {if (show_links) {return "block"} else {return "none"}});

	// ensembl
	var ensemblLoc = links_pane
	    .append("span")
	    .attr("class", "tnt_link_label")
	    .attr("title", "Open region in Ensembl")
	    .on("click", function() {var link = buildEnsemblLink(); window.open(link, "_blank")});
	ensemblLoc
	    .append("img")
	    .attr("src", path + "./pics/e_open_in_new_window.png")
	    .attr("width", "40px");

	gB.start();

    };

///*********************////
/// RENDERING FUNCTIONS ////
///*********************////
    // Private functions

    // callbacks plugged to the gBrowser object
    var gene_info_cbak = function (gene) {
	var sel = d3.select("#tnt_" + div_id + "_gene_info");

	sel
	    .classed("tnt_gene_info_active", true)
	    .append("p")
	    .attr("class", "tnt_gene_info_paragraph")
	    // .style("color", gBrowserTheme.foreground_color().darker())
	    // .style("background-color", gBrowserTheme.background_color().brighter())
	    // .style("height", gBrowser.height() + "px")
	    .html(function () {
		return "<h1>" + gene.external_name + "</h1>" +
		    "Ensembl ID: <i>" + gene.ID + "</i><br />" +
		    "Description: <i>" + gene.description + "</i><br />" +
		    "Source: <i>" + gene.logic_name + "</i><br />" +
		    "loc: <i>" + gene.seq_region_name + ":" + gene.start + "-" + gene.end + " (Strand: " + gene.strand + ")</i><br />";});

	sel.append("span")
	    .attr("class", "tnt_text_rotated")
	    .style("top", ~~gBrowser.height()/2 + "px")
	    .style("background-color", gBrowserTheme.foreground_color())
	    .append("text")
	    .attr("class", "tnt_link")
	    .style("color", gBrowserTheme.background_color())
	    .text("[Close]")
	    .on("click", function() {d3.select("#tnt_" + div_id + "_gene_info" + " p").remove();
				     d3.select("#tnt_" + div_id + "_gene_info" + " span").remove();
				     sel.classed("tnt_gene_info_active", false)});

    };

    //// API
    gBrowserTheme.left = function () {
	gBrowser.move_left(1.5);
    };

    gBrowserTheme.right = function () {
	gBrowser.move_right(1.5);
    };

    gBrowserTheme.zoomIn = function () {
	gBrowser.zoom(1.5);
    }

    gBrowserTheme.zoomOut = function () {
	gBrowser.zoom(0.5);
    }

    gBrowserTheme.show_options = function(b) {
	show_options = b;
	return gBrowserTheme;
    };

    gBrowserTheme.show_title = function(b) {
	show_title = b;
	return gBrowserTheme;
    };

    gBrowserTheme.show_links = function(b) {
	show_links = b;
	return gBrowserTheme;
    };

    gBrowserTheme.title = function (s) {
	if (!arguments.length) {
	    return title;
	}
	title = s;
	return gBrowserTheme;
    };

    gBrowserTheme.foreground_color = function (c) {
	if (!arguments.length) {
	    return fgColor;
	}
	fgColor = c;
	return gBrowserTheme;
    };

    gBrowserTheme.background_color = function (c) {
	if (!arguments.length) {
	    return bgColor;
	}
	bgColor = c;
	return gBrowserTheme;
    };

    var set_div_id = function(div) {
	div_id = d3.select(div).attr("id");
    };


    ///*********************////
    /// UTILITY METHODS     ////
    ///*********************////
    // Private methods
    var buildLink = function(platform) {
	var url = "http://www.ebi.ac.uk/~mp/minimalGenomeBrowser/themes/";
	var postfix = "";
	if (platform === "desktop") {
	    url = url + "compact/compact.html";
	} else if (platform === "mobile") {
	    url = url + "mobile/mobile.html";
	    postfix = "#browser";
	}
	url = url + "?loc=" + gBrowser.species() + ":" + gBrowser.chr() + ":" + gBrowser.from() + "-" + gBrowser.to() + postfix;
	return url;
    };

    var buildEnsemblLink = function() {
	var url = "http://www.ensembl.org/" + gBrowser.species() + "/Location/View?r=" + gBrowser.chr() + "%3A" + gBrowser.from() + "-" + gBrowser.to();
	return url;
    };


    // Public methods

    /** <strong>isLocation</strong> determines if the argument looks like a location of the form
	species:chr:from-to or false otherwise
	@param {String} location The string to be tested
	@returns {Boolean} If the string looks like a location or not
    */
    var isLocation = function(term) {
	if (term.match(loc_re)) {
	    return true;
	} else {
	    return false;
	}
    };


    /** <strong>buildEnsemblGeneLink</strong> returns the Ensembl url pointing to the gene summary of the given gene
	@param {String} gene The Ensembl gene id. Should be a valid ID of the form ENSGXXXXXXXXX"
	@returns {String} The Ensembl URL for the given gene
    */
    var buildEnsemblGeneLink = function(ensID) {
	//"http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000139618"
	var url = "http://www.ensembl.org/" + gBrowser.species() + "/Gene/Summary?g=" + ensID;
	return url;
    };



    return gBrowserTheme;
};


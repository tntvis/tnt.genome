var variable_height = function() {

    var current_height = 200;

    var theme = function(gB, div) {

    	gB(div);

    	var gene_track = tnt.board.track()
    	    .height(current_height) // the default height
    	    .background_color("#FFFFFF")
            .display(tnt.board.track.feature.genome.gene()
    		     .foreground_color("#550055")
    		)
    	    .data(tnt.board.track.data.genome.gene());

        // expand or contract the height of the gene track as needed
        gene_track.display().layout()
            .fixed_slot_type("expanded")
            .on_layout_run (function (types, current) {
                var needed_height = types.expanded.needed_slots * types.expanded.slot_height;
                if (needed_height !== current_height) {
                    current_height = needed_height;
                    gene_track.height(needed_height);
                    gB.reorder(gB.tracks());
                }
            });

    	gB.add_track(gene_track);
     	gB.start();

    };

    return theme;
};

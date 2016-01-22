var current_height = 200;

var gene_track = tnt.board.track()
    .height(current_height) // the default height
    .color("#FFFFFF")
    .display(tnt.board.track.feature.genome.gene()
	     .color("#550055")
	)
    .data(tnt.board.track.data.genome.gene());

// expand or contract the height of the gene track as needed
gene_track.display().layout()
    .fixed_slot_type("expanded")
    .keep_slots(false)
    .on_layout_run (function (types, current) {
        var needed_height = types.expanded.needed_slots * types.expanded.slot_height;
        if (needed_height !== current_height) {
            current_height = needed_height;
            gene_track.height(needed_height);
            genome.tracks(genome.tracks());
        }
    });

var genome = tnt.board.genome().species("human").gene("brca2").width(950);

genome.add_track(gene_track);

genome(yourDiv);
genome.start();

var genome = tnt.board.genome().species("human").gene("brca2").width(950);

var gene_track = tnt.board.track()
    .height(200)
    .color("white")
    .display(tnt.board.track.feature.genome.gene()
        .color("#550055")
    )
    .data(tnt.board.track.data.genome.gene());

var sequence_track = tnt.board.track()
    .height(30)
    .color("white")
    .display(tnt.board.track.feature.genome.sequence())
    .data(tnt.board.track.data.genome.sequence()
        .limit(150)
    );

genome
    .zoom_in(100)
    .add_track(sequence_track)
    .add_track(gene_track);

genome(yourDiv);
genome.start();

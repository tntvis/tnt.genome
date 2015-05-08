var board = require("tnt.board");
board.genome = require("./genome");
board.track.layout.feature = require("./layout");
board.track.feature.genome = require("./feature");
board.track.data.genome = require("./data");

module.exports = exports = board;


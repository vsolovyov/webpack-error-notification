var execFile = require('child_process').execFile;


var STRATEGIES = {
    'darwin': function(msg) {
        msg = escapeColors(msg);
        execFile('terminal-notifier', ['-title', 'Webpack', '-message', msg]);
    },
    'linux': function(msg) {
        msg = escapeColors(msg);
        msg = escapeHtml(msg);
        execFile('notify-send', ['Webpack', msg]);
    }
};

function escapeColors(msg) {
    return msg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function WebpackErrorNotificationPlugin(strategy, opts) {
    this.lastBuildSucceeded = false;
    this.notifier = null;
    this.opts = opts || { notifyWarnings: true };

    if (typeof strategy === 'function') {
        this.notifier = strategy;
        return;
    }

    if (typeof strategy === 'undefined') {
        strategy = process.platform;
    }

    if (STRATEGIES.hasOwnProperty(strategy)) {
        this.notifier = STRATEGIES[strategy];
    }
};


WebpackErrorNotificationPlugin.prototype.compileMessage = function(stats) {
    var error;
    if (stats.hasWarnings() &&
        this.opts.notifyWarnings) {
        error = stats.compilation.warnings[0];
    }
    if (stats.hasErrors()) {
        error = stats.compilation.errors[0];
    }

    if (error) {
        try {
            this.lastBuildSucceeded = false;
            return error.module.rawRequest + '\n' + error.error.toString();
        } catch (e) {
            return "Unknown error or warning";
        }
    }

    if (!this.lastBuildSucceeded) {
        this.lastBuildSucceeded = true;
        return 'Successful build';
    }
};


WebpackErrorNotificationPlugin.prototype.compilationDone = function(stats) {
    var msg = this.compileMessage(stats);
    if (msg) {
        this.notifier(msg);
    }
};


WebpackErrorNotificationPlugin.prototype.apply = function(compiler) {
    if (this.notifier === null) {
        console.log('Failed to set error notification.');
    } else {
        if (typeof compiler.hooks === 'undefined') {
            // Backwards-compatible for pre webpack-4
            compiler.plugin('done', this.compilationDone.bind(this));
        } else {
            compiler.hooks.done.tap("webpack-error-notification", this.compilationDone.bind(this))
        }
    }
};


module.exports = WebpackErrorNotificationPlugin;

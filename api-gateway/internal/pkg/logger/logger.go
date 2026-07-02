package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

type Logger interface {
	Debug(msg string, keyvals ...interface{})
	Info(msg string, keyvals ...interface{})
	Warn(msg string, keyvals ...interface{})
	Error(msg string, keyvals ...interface{})
	Fatal(msg string, keyvals ...interface{})
}

type logrusLogger struct {
	logger *logrus.Logger
}

func NewLogger(level, format string) Logger {
	logger := logrus.New()
	logger.SetOutput(os.Stdout)

	// Set log level
	switch level {
	case "debug":
		logger.SetLevel(logrus.DebugLevel)
	case "info":
		logger.SetLevel(logrus.InfoLevel)
	case "warn":
		logger.SetLevel(logrus.WarnLevel)
	case "error":
		logger.SetLevel(logrus.ErrorLevel)
	default:
		logger.SetLevel(logrus.InfoLevel)
	}

	// Set log format
	if format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05.000Z",
		})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02T15:04:05.000Z",
		})
	}

	return &logrusLogger{logger: logger}
}

func (l *logrusLogger) Debug(msg string, keyvals ...interface{}) {
	l.logger.WithFields(l.parseKeyvals(keyvals...)).Debug(msg)
}

func (l *logrusLogger) Info(msg string, keyvals ...interface{}) {
	l.logger.WithFields(l.parseKeyvals(keyvals...)).Info(msg)
}

func (l *logrusLogger) Warn(msg string, keyvals ...interface{}) {
	l.logger.WithFields(l.parseKeyvals(keyvals...)).Warn(msg)
}

func (l *logrusLogger) Error(msg string, keyvals ...interface{}) {
	l.logger.WithFields(l.parseKeyvals(keyvals...)).Error(msg)
}

func (l *logrusLogger) Fatal(msg string, keyvals ...interface{}) {
	l.logger.WithFields(l.parseKeyvals(keyvals...)).Fatal(msg)
}

func (l *logrusLogger) parseKeyvals(keyvals ...interface{}) logrus.Fields {
	fields := logrus.Fields{}

	for i := 0; i < len(keyvals); i += 2 {
		if i+1 < len(keyvals) {
			key, ok := keyvals[i].(string)
			if ok {
				fields[key] = keyvals[i+1]
			}
		}
	}

	return fields
}

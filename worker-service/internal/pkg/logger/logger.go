package logger

import (
	"log"
	"os"
)

type Logger interface {
	Info(msg string, args ...interface{})
	Error(msg string, args ...interface{})
	Debug(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
}

type logger struct {
	infoLogger  *log.Logger
	errorLogger *log.Logger
	debugLogger *log.Logger
	warnLogger  *log.Logger
}

func NewLogger() Logger {
	return &logger{
		infoLogger:  log.New(os.Stdout, "[INFO] ", log.LstdFlags),
		errorLogger: log.New(os.Stderr, "[ERROR] ", log.LstdFlags),
		debugLogger: log.New(os.Stdout, "[DEBUG] ", log.LstdFlags),
		warnLogger:  log.New(os.Stdout, "[WARN] ", log.LstdFlags),
	}
}

func (l *logger) Info(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.infoLogger.Printf(msg, args...)
	} else {
		l.infoLogger.Println(msg)
	}
}

func (l *logger) Error(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.errorLogger.Printf(msg, args...)
	} else {
		l.errorLogger.Println(msg)
	}
}

func (l *logger) Debug(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.debugLogger.Printf(msg, args...)
		return
	}
	l.debugLogger.Println(msg)
}

func (l *logger) Warn(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.warnLogger.Printf(msg, args...)
		return
	}
	l.warnLogger.Println(msg)
}

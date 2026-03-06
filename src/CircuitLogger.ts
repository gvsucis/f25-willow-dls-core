/*
 * Copyright (c) 2025 Jordan Bancino <jordan@bancino.net>
 * Copyright (c) 2025 Austin Hargis <hargisa@mail.gvsu.edu>
 * Copyright (c) 2025 Aaron MacDougall <macdouaa@mail.gvsu.edu>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * The various log levels at which a {@link CircuitLoggable} can log messages.
 */
export enum LogLevel {
  /**
   * This log level is used for debug messages which are so low-level as to be
   * useless and overly verbose for _most_ normal users. Setting the log level
   * to `TRACE` will result in massively large log files only really useful to
   * developers.
   */
  TRACE,

  /**
   * This log level is used for basic debug messages which show the flow and
   * internal logic of the simulation engine. It won't be useful for most
   * users, but may provide value for those who wish to debug faulty circuits,
   * as they can follow the logic of the circuit as it progresses through the
   * simulation.
   */
  DEBUG,

  /**
   * This log level is used for informative messages that provide some insight
   * into the state of the simulation engine, but glosses over some of the details
   * which may contain rationale for *why* a value is the value that it is.
   */
  INFO,

  /**
   * This log level is used for warnings which are raised during the simulation and
   * should not be ignored. Warnings may not be errors, but should nonetheless be handled
   * by your code. If you believe a warning is erroniously generated, open an issue.
   */
  WARN,

  /**
   * This log level is used for reporting errors which are not fatal&mdash;that is, do not
   * cause the simulation to abort&mdash;but are still nonetheless major errors in the execution
   * of the simulation. These may arise as a result of faulty logic on our part, but some circuits
   * may also raise errors if they are poorly designed.
   */
  ERROR,

  /**
   * This log level is used for reporting fatal errors after which the simulation cannot
   * continue. Immediately after reporting the error, it is likely that an uncaught exception
   * will be thrown.
   */
  FATAL,
}

/**
 * An array of string representations of {@link LogLevel}, which can be indexed into by
 * {@link LogLevel}. This is useful for printing log messages into a file or a console
 * in a human-readable way.
 */
export const logLevelString = [
  "TRACE",
  "DEBUG",
  "INFO",
  "WARNING",
  "ERROR",
  "FATAL",
];

/**
 * A Circuit Logger is a log *sink*. Messages are sent to circuit loggers via
 * {@link CircuitLoggable}. Loggers are responsible for storing the messages
 * and outputting them to either another logging framework, or sink them into
 * a file or log server. There are no limitations as to what a logger can do
 * with log messages that it receives, however {@link output} should complete
 * relatively quickly, as it is not asynchronous to ensure that messages are
 * logged in the order they are intended to be.
 */
export abstract class CircuitLogger {
  #level: LogLevel = LogLevel.WARN;
  #subsystems: Set<RegExp> = new Set<RegExp>([]);
  #count: number = 0;

  /**
   * Set the log level for this logger. Note that this can be called at any
   * point, and when it is called, it does not do anything with previous messages,
   * but it takes effect immediately when future messages are logged.
   * @param level The log level below which no messages will be output to this
   * logger. All messages at or above this level will be logged.
   * @returns The current instance of {@link CircuitLogger}, for method chaining.
   */
  setLevel(level: LogLevel): CircuitLogger {
    this.#level = level;
    return this;
  }

  /**
   * {@link CircuitLoggable}s are assigned a "subsystem" ID which identifies it
   * uniquely as something that logs messages. These subsystem strings can be used
   * to filter out logs, which is exactly what this function does. It allows you to
   * specify which subsystems you want to be logged and which subsystems you want
   * to ignore.
   * @param subsystems An array of regular expressions which a {@link CircuitLoggable}'s
   * subsystem ID must match in order for it to be logged. Note that only only one regular
   * expression needs to be matched; as soon as a match is found, the message will be
   * logged if the log level allows it. This allows you to log multiple subsystems without
   * having to specify complex regular expressions; just specify a regular expression for
   * each subsystem you want to match in whatever way makes sense to you.
   * @returns The current instanceof {@link CircuitLogger}, for method chaining.
   */
  setSubsystems(...subsystems: RegExp[]): CircuitLogger {
    this.#subsystems = new Set(subsystems);
    return this;
  }

  #subsystemMatches(subsystem: string): boolean {
    if (!this.#subsystems.size) {
      return true;
    }

    for (const regex of this.#subsystems) {
      if (regex.test(subsystem)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Attach this logger to a loggable object, so that messages logged in that
   * object will be received by the logger. This function simply calls
   * {@link CircuitLoggable.attachLogger}.
   * @param loggable The loggable object to attach this logger to.
   * @returns This logger, for method chaining.
   */
  attachTo(loggable: CircuitLoggable): CircuitLogger {
    loggable.attachLogger(this);
    return this;
  }

  /**
   * Remove this logger from a loggable object, so that messages logged in that
   * object will no longer be received by this logger. This function simply calls
   * {@link CircuitLoggable.detachLogger}.
   * @param loggable The loggable object to detach this logger from.
   * @returns This logger, for method chaining.
   */
  detachFrom(loggable: CircuitLoggable): CircuitLogger {
    loggable.detachLogger(this);
    return this;
  }

  /**
   * Log a message to this logger. This method should normally not be used by
   * most code, instead it is called by {@link CircuitLoggable.log}.
   * @param level The log level at which the message should be logged.
   * @param subsystem The subsystem for which the message is being logged.
   * @param msg The message to be logged.
   * @param data Any additional data which should  be logged but isn't necessarily
   * fit for being embedded in the message.
   */
  log(level: LogLevel, subsystem: string, msg: string, data?: any): void {
    if (level < this.#level) {
      return;
    }

    if (this.#subsystemMatches(subsystem)) {
      const timestamp = new Date();
      this.#count++;
      this.output(this.#count, timestamp, level, subsystem, msg, data);
    }
  }

  /**
   * This abstract function is to be implemented by loggers. It sinks the provided
   * log message to whatever the log output is, be it a database, syslog, file, etc.
   * @param count A counter which increments up for each message that is logged. This
   * can be used to ensure that messages are ordered correctly, or displayed in the
   * final output somehow.
   * @param timestamp The exact timestamp at which the log message was generated.
   * @param level The log level that the message is being logged at. Note that this
   * function does not need to check the log level to filter out messages; messages
   * will not be passed to this function in the first place if it shouldn't be logged
   * due to the log level being too high.
   * @param subsystem The subsystem from which the log message came.
   * @param msg The log message.
   * @param data Any additional data associated with the message but not explicitly a part
   * of it.
   */
  abstract output(
    count: number,
    timestamp: Date,
    level: LogLevel,
    subsystem: string,
    msg: string,
    data?: any,
  ): void;
}

/**
 * A Circuit Loggable is a log *source*. Messages are generated by circuit loggables
 * using the {@link log} function and sent to {@link CircuitLogger}s registered with
 * the given loggable. Loggables have a subsystem and an ID which they can
 * use to uniquely identify themselves in the log output.
 *
 * This abstract class creates a logging "tree" structure, where a loggable can be
 * composed of child loggables, and when a logger is attached or detached from a
 * loggable, the same operation is applied to all of its children. Child loggables are
 * added via {@link propagateLoggersTo} and will be affected by calls to {@link attachLogger}
 * and {@link detachLogger} on parent objects.
 */
export abstract class   CircuitLoggable {
  #subsystem: string;
  #loggers: Set<CircuitLogger> = new Set([]);
  #children: Set<CircuitLoggable> = new Set([]);

  #id: number;

  static #counter: number = 0;

  /**
   * Construct a new loggable object with the given subsystem.
   * @param subsystem An optional subsystem tag which defaults to '(None)'. It
   * is highly recommended that all loggables provide a subsystem tag based
   * at least in part on their class name.
   */
  constructor(subsystem: string = "(None)") {
    this.#subsystem = subsystem;
    this.#id = CircuitLoggable.#counter++;
  }

  /**
   * Attach a logger to this loggable object so that messages logged with
   * {@link log} will be send to this logger. Note that this can be called
   * multiple times and multiple loggers can be attached to the same object.
   * Log messages will be sent to all attached loggers.
   * @param logger The logger to attach to this object.
   */
  attachLogger(logger: CircuitLogger): void {
    this.#loggers.add(logger);
    this.#children.forEach((child) => child.attachLogger(logger));
  }

  /**
   * Detach a logger from this loggable object so that messages logged with
   * {@link log} will no longer be sent to it. If the logger is not attached,
   * nothing happens.
   * @param logger The logger to detach from this object.
   */
  detachLogger(logger: CircuitLogger): void {
    this.#loggers.delete(logger);
    this.#children.forEach((child) => child.detachLogger(logger));
  }

  /**
   * Propagate all registered loggers (present and future) to the given loggable.
   * This function will register the loggable object with the object it is being
   * called on, establishing a parent-child relationship where all changes to the
   * parent loggers will be propagated to the children.
   * @param loggable The loggable object to attach all registered loggers to.
   */
  propagateLoggersTo(loggable: CircuitLoggable): void {
    this.#loggers.forEach((l) => loggable.attachLogger(l));
    this.#children.add(loggable);
  }

  /**
   * Everything that is loggable gets a unique ID, which can help identify instances
   * of objects in logs when many such instances exist. This ID is normally generated
   * automatically by {@link CircuitLoggable} when it is instantiated,
   * unless this method has been by child classes.
   *
   * @returns A unique ID among all loggable objects.
   */
  getId(): string {
    return this.#id.toString();
  }

  /**
   * Log a message, sending it to all loggers associated with this loggable.
   * @param level The log level to log the message at.
   * @param msg The message to log.
   * @param data Any additional data to associate with the message.
   */
  log(level: LogLevel, msg: string, data?: any): void {
    this.#loggers.forEach((l) => l.log(level, this.#subsystem, msg, data));
  }
}

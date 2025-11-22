import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/**
 * Custom validator to sanitize HTML/script tags from string inputs
 * Prevents XSS attacks by stripping potentially dangerous content
 */
export function IsSanitized(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSanitized",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") return true;

          // Check for script tags
          if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(value)) {
            return false;
          }

          // Check for inline event handlers
          if (/on\w+\s*=\s*["'][^"']*["']/gi.test(value)) {
            return false;
          }

          // Check for javascript: protocol
          if (/javascript:/gi.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially dangerous content`;
        },
      },
    });
  };
}

/**
 * Custom validator to ensure string length is within reasonable bounds
 */
export function IsReasonableLength(
  min: number = 1,
  max: number = 10000,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isReasonableLength",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") return true;
          const [min, max] = args.constraints;
          return value.length >= min && value.length <= max;
        },
        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;
          return `${args.property} must be between ${min} and ${max} characters`;
        },
      },
    });
  };
}

/**
 * Custom validator to ensure array size is within bounds
 */
export function IsReasonableArraySize(
  min: number = 1,
  max: number = 100,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isReasonableArraySize",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return true;
          const [min, max] = args.constraints;
          return value.length >= min && value.length <= max;
        },
        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;
          return `${args.property} must contain between ${min} and ${max} items`;
        },
      },
    });
  };
}

/**
 * Custom validator for safe file paths (no directory traversal)
 */
export function IsSafeFilePath(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSafeFilePath",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") return true;

          // Check for directory traversal patterns
          if (/\.\.[/\\]/.test(value)) {
            return false;
          }

          // Check for absolute paths (depending on your requirements)
          // Uncomment if you want to disallow absolute paths
          // if (/^[/\\]|^[a-zA-Z]:[/\\]/.test(value)) {
          //   return false;
          // }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains unsafe path patterns`;
        },
      },
    });
  };
}

/**
 * Custom validator for URL validation with allowed protocols
 */
export function IsSafeUrl(
  allowedProtocols: string[] = ["http", "https"],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSafeUrl",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [allowedProtocols],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") return true;

          try {
            const url = new URL(value);
            const [allowedProtocols] = args.constraints;
            return allowedProtocols.includes(url.protocol.replace(":", ""));
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const [allowedProtocols] = args.constraints;
          return `${args.property} must be a valid URL with protocol: ${allowedProtocols.join(", ")}`;
        },
      },
    });
  };
}

/**
 * Custom validator to ensure session ID format is valid
 */
export function IsValidSessionId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isValidSessionId",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") return true;

          // Session ID format: session-{timestamp}-{random}
          // or any alphanumeric with hyphens/underscores
          return /^[a-zA-Z0-9_-]{3,50}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid session identifier (3-50 alphanumeric characters, hyphens, or underscores)`;
        },
      },
    });
  };
}

import { AGENT_MODELS } from "../../shared/agent-models.constants";

/**
 * Custom validator to check if a string is a valid model name
 */
export function IsModelName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isModelName",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") return true;
          return AGENT_MODELS.some((m) => m.name === value);
        },
        defaultMessage(args: ValidationArguments) {
          const models = AGENT_MODELS.map((m) => m.name).join(", ");
          return `${args.property} must be a valid model name (${models})`;
        },
      },
    });
  };
}

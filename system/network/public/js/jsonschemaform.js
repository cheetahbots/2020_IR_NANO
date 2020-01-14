function DefaultErrorList(props) {
    const { errors } = props;
    return (
        <div className="panel panel-danger errors">
            <div className="panel-heading">
                <h3 className="panel-title">Errors</h3>
            </div>
            <ul className="list-group">
                {errors.map((error, i) => {
                    return (
                        <li key={i} className="list-group-item text-danger">
                            {error.stack}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

const ADDITIONAL_PROPERTY_FLAG = "__additional_property";

const widgetMap = {
    boolean: {
        checkbox: "CheckboxWidget",
        radio: "RadioWidget",
        select: "SelectWidget",
        hidden: "HiddenWidget",
    },
    string: {
        text: "TextWidget",
        password: "PasswordWidget",
        email: "EmailWidget",
        hostname: "TextWidget",
        ipv4: "TextWidget",
        ipv6: "TextWidget",
        uri: "URLWidget",
        "data-url": "FileWidget",
        radio: "RadioWidget",
        select: "RadioWidget",
        //select: "SelectWidget",
        textarea: "TextareaWidget",
        hidden: "HiddenWidget",
        date: "DateWidget",
        datetime: "DateTimeWidget",
        "date-time": "DateTimeWidget",
        "alt-date": "AltDateWidget",
        "alt-datetime": "AltDateTimeWidget",
        color: "ColorWidget",
        file: "FileWidget",
    },
    number: {
        text: "TextWidget",
        select: "SelectWidget",
        updown: "UpDownWidget",
        range: "RangeWidget",
        radio: "RadioWidget",
        hidden: "HiddenWidget",
    },
    integer: {
        text: "TextWidget",
        select: "SelectWidget",
        updown: "UpDownWidget",
        range: "RangeWidget",
        radio: "RadioWidget",
        hidden: "HiddenWidget",
    },
    array: {
        select: "SelectWidget",
        checkboxes: "CheckboxesWidget",
        files: "FileWidget",
        hidden: "HiddenWidget",
    },
};

function getDefaultRegistry() {
    return {
        fields: {
            AnyOfField: MultiSchemaField,
            ArrayField,
            BooleanField,
            DescriptionField,
            NumberField,
            ObjectField,
            OneOfField: MultiSchemaField,
            SchemaField,
            StringField,
            TitleField,
            NullField,
            UnsupportedField,
        },
        widgets: {
            BaseInput,
            PasswordWidget,
            RadioWidget,
            UpDownWidget,
            RangeWidget,
            SelectWidget,
            TextWidget,
            DateWidget,
            DateTimeWidget,
            AltDateWidget,
            AltDateTimeWidget,
            EmailWidget,
            URLWidget,
            TextareaWidget,
            HiddenWidget,
            ColorWidget,
            FileWidget,
            CheckboxWidget,
            CheckboxesWidget,
        },
        definitions: {},
        formContext: {},
    };
}

/* Gets the type of a given schema. */
function getSchemaType(schema) {
    let { type } = schema;

    if (!type && schema.const) {
        return guessType(schema.const);
    }

    if (!type && schema.enum) {
        return "string";
    }

    if (!type && (schema.properties || schema.additionalProperties)) {
        return "object";
    }

    if (type instanceof Array && type.length === 2 && type.includes("null")) {
        return type.find(type => type !== "null");
    }

    return type;
}

function getWidget(schema, widget, registeredWidgets = {}) {
    const type = getSchemaType(schema);

    function mergeOptions(Widget) {
        // cache return value as property of widget for proper react reconciliation
        if (!Widget.MergedWidget) {
            const defaultOptions =
                (Widget.defaultProps && Widget.defaultProps.options) || {};
            Widget.MergedWidget = ({ options = {}, ...props }) => (
                <Widget options={{ ...defaultOptions, ...options }} {...props} />
            );
        }
        return Widget.MergedWidget;
    }

    if (
        typeof widget === "function"
        //||
        // ReactIs.isForwardRef(React.createElement(widget)) ||
        // ReactIs.isMemo(widget)
    ) {
        return mergeOptions(widget);
    }

    if (typeof widget !== "string") {
        throw new Error(`Unsupported widget definition: ${typeof widget}`);
    }

    if (registeredWidgets.hasOwnProperty(widget)) {
        const registeredWidget = registeredWidgets[widget];
        return getWidget(schema, registeredWidget, registeredWidgets);
    }

    if (!widgetMap.hasOwnProperty(type)) {
        throw new Error(`No widget for type "${type}"`);
    }

    if (widgetMap[type].hasOwnProperty(widget)) {
        const registeredWidget = registeredWidgets[widgetMap[type][widget]];
        return getWidget(schema, registeredWidget, registeredWidgets);
    }

    throw new Error(`No widget "${widget}" for type "${type}"`);
}

function hasWidget(schema, widget, registeredWidgets = {}) {
    try {
        getWidget(schema, widget, registeredWidgets);
        return true;
    } catch (e) {
        if (
            e.message &&
            (e.message.startsWith("No widget") ||
                e.message.startsWith("Unsupported widget"))
        ) {
            return false;
        }
        throw e;
    }
}

function computeDefaults(
    schema,
    parentDefaults,
    definitions,
    rawFormData = {},
    includeUndefinedValues = false
) {
    const formData = isObject(rawFormData) ? rawFormData : {};
    // Compute the defaults recursively: give highest priority to deepest nodes.
    let defaults = parentDefaults;
    if (isObject(defaults) && isObject(schema.default)) {
        // For object defaults, only override parent defaults that are defined in
        // schema.default.
        defaults = mergeObjects(defaults, schema.default);
    } else if ("default" in schema) {
        // Use schema defaults for this node.
        defaults = schema.default;
    } else if ("$ref" in schema) {
        // Use referenced schema defaults for this node.
        const refSchema = findSchemaDefinition(schema.$ref, definitions);
        return computeDefaults(
            refSchema,
            defaults,
            definitions,
            formData,
            includeUndefinedValues
        );
    } else if ("dependencies" in schema) {
        const resolvedSchema = resolveDependencies(schema, definitions, formData);
        return computeDefaults(
            resolvedSchema,
            defaults,
            definitions,
            formData,
            includeUndefinedValues
        );
    } else if (isFixedItems(schema)) {
        defaults = schema.items.map((itemSchema, idx) =>
            computeDefaults(
                itemSchema,
                Array.isArray(parentDefaults) ? parentDefaults[idx] : undefined,
                definitions,
                formData,
                includeUndefinedValues
            )
        );
    } else if ("oneOf" in schema) {
        schema =
            schema.oneOf[getMatchingOption(undefined, schema.oneOf, definitions)];
    } else if ("anyOf" in schema) {
        schema =
            schema.anyOf[getMatchingOption(undefined, schema.anyOf, definitions)];
    }

    // Not defaults defined for this node, fallback to generic typed ones.
    if (typeof defaults === "undefined") {
        defaults = schema.default;
    }

    switch (getSchemaType(schema)) {
        // We need to recur for object schema inner default values.
        case "object":
            return Object.keys(schema.properties || {}).reduce((acc, key) => {
                // Compute the defaults for this node, with the parent defaults we might
                // have from a previous run: defaults[key].
                let computedDefault = computeDefaults(
                    schema.properties[key],
                    (defaults || {})[key],
                    definitions,
                    (formData || {})[key],
                    includeUndefinedValues
                );
                if (includeUndefinedValues || computedDefault !== undefined) {
                    acc[key] = computedDefault;
                }
                return acc;
            }, {});

        case "array":
            // Inject defaults into existing array defaults
            if (Array.isArray(defaults)) {
                defaults = defaults.map((item, idx) => {
                    return computeDefaults(
                        schema.items[idx] || schema.additionalItems || {},
                        item,
                        definitions
                    );
                });
            }

            // Deeply inject defaults into already existing form data
            if (Array.isArray(rawFormData)) {
                defaults = rawFormData.map((item, idx) => {
                    return computeDefaults(
                        schema.items,
                        (defaults || {})[idx],
                        definitions,
                        item
                    );
                });
            }
            if (schema.minItems) {
                if (!isMultiSelect(schema, definitions)) {
                    const defaultsLength = defaults ? defaults.length : 0;
                    if (schema.minItems > defaultsLength) {
                        const defaultEntries = defaults || [];
                        // populate the array with the defaults
                        const fillerSchema = Array.isArray(schema.items)
                            ? schema.additionalItems
                            : schema.items;
                        const fillerEntries = fill(
                            new Array(schema.minItems - defaultsLength),
                            computeDefaults(fillerSchema, fillerSchema.defaults, definitions)
                        );
                        // then fill up the rest with either the item default or empty, up to minItems

                        return defaultEntries.concat(fillerEntries);
                    }
                } else {
                    return defaults ? defaults : [];
                }
            }
    }
    return defaults;
}

function getDefaultFormState(
    _schema,
    formData,
    definitions = {},
    includeUndefinedValues = false
) {
    if (!isObject(_schema)) {
        throw new Error("Invalid schema: " + _schema);
    }
    const schema = retrieveSchema(_schema, definitions, formData);
    const defaults = computeDefaults(
        schema,
        _schema.default,
        definitions,
        formData,
        includeUndefinedValues
    );
    if (typeof formData === "undefined") {
        // No form data? Use schema defaults.
        return defaults;
    }
    if (isObject(formData) || Array.isArray(formData)) {
        return mergeDefaultsWithFormData(defaults, formData);
    }
    if (formData === 0 || formData === false || formData === "") {
        return formData;
    }
    return formData || defaults;
}

/**
 * When merging defaults and form data, we want to merge in this specific way:
 * - objects are deeply merged
 * - arrays are merged in such a way that:
 *   - when the array is set in form data, only array entries set in form data
 *     are deeply merged; additional entries from the defaults are ignored
 *   - when the array is not set in form data, the default is copied over
 * - scalars are overwritten/set by form data
 */
function mergeDefaultsWithFormData(defaults, formData) {
    if (Array.isArray(formData)) {
        if (!Array.isArray(defaults)) {
            defaults = [];
        }
        return formData.map((value, idx) => {
            if (defaults[idx]) {
                return mergeDefaultsWithFormData(defaults[idx], value);
            }
            return value;
        });
    } else if (isObject(formData)) {
        const acc = Object.assign({}, defaults); // Prevent mutation of source object.
        return Object.keys(formData).reduce((acc, key) => {
            acc[key] = mergeDefaultsWithFormData(
                defaults ? defaults[key] : {},
                formData[key]
            );
            return acc;
        }, acc);
    } else {
        return formData;
    }
}

function getUiOptions(uiSchema) {
    // get all passed options from ui:widget, ui:options, and ui:<optionName>
    return Object.keys(uiSchema)
        .filter(key => key.indexOf("ui:") === 0)
        .reduce((options, key) => {
            const value = uiSchema[key];

            if (key === "ui:widget" && isObject(value)) {
                console.warn(
                    "Setting options via ui:widget object is deprecated, use ui:options instead"
                );
                return {
                    ...options,
                    ...(value.options || {}),
                    widget: value.component,
                };
            }
            if (key === "ui:options" && isObject(value)) {
                return { ...options, ...value };
            }
            return { ...options, [key.substring(3)]: value };
        }, {});
}

function isObject(thing) {
    if (typeof File !== "undefined" && thing instanceof File) {
        return false;
    }
    return typeof thing === "object" && thing !== null && !Array.isArray(thing);
}

function mergeObjects(obj1, obj2, concatArrays = false) {
    // Recursively merge deeply nested objects.
    var acc = Object.assign({}, obj1); // Prevent mutation of source object.
    return Object.keys(obj2).reduce((acc, key) => {
        const left = obj1 ? obj1[key] : {},
            right = obj2[key];
        if (obj1 && obj1.hasOwnProperty(key) && isObject(right)) {
            acc[key] = mergeObjects(left, right, concatArrays);
        } else if (concatArrays && Array.isArray(left) && Array.isArray(right)) {
            acc[key] = left.concat(right);
        } else {
            acc[key] = right;
        }
        return acc;
    }, acc);
}

function asNumber(value) {
    if (value === "") {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (/\.$/.test(value)) {
        // "3." can't really be considered a number even if it parses in js. The
        // user is most likely entering a float.
        return value;
    }
    if (/\.0$/.test(value)) {
        // we need to return this as a string here, to allow for input like 3.07
        return value;
    }
    const n = Number(value);
    const valid = typeof n === "number" && !Number.isNaN(n);

    if (/\.\d*0$/.test(value)) {
        // It's a number, that's cool - but we need it as a string so it doesn't screw
        // with the user when entering dollar amounts or other values (such as those with
        // specific precision or number of significant digits)
        return value;
    }

    return valid ? n : value;
}

function orderProperties(properties, order) {
    if (!Array.isArray(order)) {
        return properties;
    }

    const arrayToHash = arr =>
        arr.reduce((prev, curr) => {
            prev[curr] = true;
            return prev;
        }, {});
    const errorPropList = arr =>
        arr.length > 1
            ? `properties '${arr.join("', '")}'`
            : `property '${arr[0]}'`;
    const propertyHash = arrayToHash(properties);
    const orderFiltered = order.filter(
        prop => prop === "*" || propertyHash[prop]
    );
    const orderHash = arrayToHash(orderFiltered);

    const rest = properties.filter(prop => !orderHash[prop]);
    const restIndex = orderFiltered.indexOf("*");
    if (restIndex === -1) {
        if (rest.length) {
            throw new Error(
                `uiSchema order list does not contain ${errorPropList(rest)}`
            );
        }
        return orderFiltered;
    }
    if (restIndex !== orderFiltered.lastIndexOf("*")) {
        throw new Error("uiSchema order list contains more than one wildcard item");
    }

    const complete = [...orderFiltered];
    complete.splice(restIndex, 1, ...rest);
    return complete;
}

/**
 * This function checks if the given schema matches a single
 * constant value.
 */
function isConstant(schema) {
    return (
        (Array.isArray(schema.enum) && schema.enum.length === 1) ||
        schema.hasOwnProperty("const")
    );
}

function toConstant(schema) {
    if (Array.isArray(schema.enum) && schema.enum.length === 1) {
        return schema.enum[0];
    } else if (schema.hasOwnProperty("const")) {
        return schema.const;
    } else {
        throw new Error("schema cannot be inferred as a constant");
    }
}

function isSelect(_schema, definitions = {}) {
    const schema = retrieveSchema(_schema, definitions);
    const altSchemas = schema.oneOf || schema.anyOf;
    if (Array.isArray(schema.enum)) {
        return true;
    } else if (Array.isArray(altSchemas)) {
        return altSchemas.every(altSchemas => isConstant(altSchemas));
    }
    return false;
}

function isMultiSelect(schema, definitions = {}) {
    if (!schema.uniqueItems || !schema.items) {
        return false;
    }
    return isSelect(schema.items, definitions);
}

function isFilesArray(schema, uiSchema, definitions = {}) {
    if (uiSchema["ui:widget"] === "files") {
        return true;
    } else if (schema.items) {
        const itemsSchema = retrieveSchema(schema.items, definitions);
        return itemsSchema.type === "string" && itemsSchema.format === "data-url";
    }
    return false;
}

function isFixedItems(schema) {
    return (
        Array.isArray(schema.items) &&
        schema.items.length > 0 &&
        schema.items.every(item => isObject(item))
    );
}

function allowAdditionalItems(schema) {
    if (schema.additionalItems === true) {
        console.warn("additionalItems=true is currently not supported");
    }
    return isObject(schema.additionalItems);
}

function optionsList(schema) {
    if (schema.enum) {
        return schema.enum.map((value, i) => {
            const label = (schema.enumNames && schema.enumNames[i]) || String(value);
            return { label, value };
        });
    } else {
        const altSchemas = schema.oneOf || schema.anyOf;
        return altSchemas.map((schema, i) => {
            const value = toConstant(schema);
            const label = schema.title || String(value);
            return { label, value };
        });
    }
}

function findSchemaDefinition($ref, definitions = {}) {
    // Extract and use the referenced definition if we have it.
    const match = /^#\/definitions\/(.*)$/.exec($ref);
    if (match && match[1]) {
        const parts = match[1].split("/");
        let current = definitions;
        for (let part of parts) {
            part = part.replace(/~1/g, "/").replace(/~0/g, "~");
            while (current.hasOwnProperty("$ref")) {
                current = findSchemaDefinition(current.$ref, definitions);
            }
            if (current.hasOwnProperty(part)) {
                current = current[part];
            } else {
                // No matching definition found, that's an error (bogus schema?)
                throw new Error(`Could not find a definition for ${$ref}.`);
            }
        }
        return current;
    }

    // No matching definition found, that's an error (bogus schema?)
    throw new Error(`Could not find a definition for ${$ref}.`);
}

// In the case where we have to implicitly create a schema, it is useful to know what type to use
//  based on the data we are defining
const guessType = function guessType(value) {
    if (Array.isArray(value)) {
        return "array";
    } else if (typeof value === "string") {
        return "string";
    } else if (value == null) {
        return "null";
    } else if (typeof value === "boolean") {
        return "boolean";
    } else if (!isNaN(value)) {
        return "number";
    } else if (typeof value === "object") {
        return "object";
    }
    // Default to string if we can't figure it out
    return "string";
};

// This function will create new "properties" items for each key in our formData
function stubExistingAdditionalProperties(
    schema,
    definitions = {},
    formData = {}
) {
    // Clone the schema so we don't ruin the consumer's original
    schema = {
        ...schema,
        properties: { ...schema.properties },
    };

    Object.keys(formData).forEach(key => {
        if (schema.properties.hasOwnProperty(key)) {
            // No need to stub, our schema already has the property
            return;
        }

        let additionalProperties;
        if (schema.additionalProperties.hasOwnProperty("$ref")) {
            additionalProperties = retrieveSchema(
                { $ref: schema.additionalProperties["$ref"] },
                definitions,
                formData
            );
        } else if (schema.additionalProperties.hasOwnProperty("type")) {
            additionalProperties = { ...schema.additionalProperties };
        } else {
            additionalProperties = { type: guessType(formData[key]) };
        }

        // The type of our new key should match the additionalProperties value;
        schema.properties[key] = additionalProperties;
        // Set our additional property flag so we know it was dynamically added
        schema.properties[key][ADDITIONAL_PROPERTY_FLAG] = true;
    });

    return schema;
}

function resolveSchema(schema, definitions = {}, formData = {}) {
    if (schema.hasOwnProperty("$ref")) {
        return resolveReference(schema, definitions, formData);
    } else if (schema.hasOwnProperty("dependencies")) {
        const resolvedSchema = resolveDependencies(schema, definitions, formData);
        return retrieveSchema(resolvedSchema, definitions, formData);
    } else if (schema.hasOwnProperty("allOf")) {
        return {
            ...schema,
            allOf: schema.allOf.map(allOfSubschema =>
                retrieveSchema(allOfSubschema, definitions, formData)
            ),
        };
    } else {
        // No $ref or dependencies attribute found, returning the original schema.
        return schema;
    }
}

function resolveReference(schema, definitions, formData) {
    // Retrieve the referenced schema definition.
    const $refSchema = findSchemaDefinition(schema.$ref, definitions);
    // Drop the $ref property of the source schema.
    const { $ref, ...localSchema } = schema;
    // Update referenced schema definition with local schema properties.
    return retrieveSchema(
        { ...$refSchema, ...localSchema },
        definitions,
        formData
    );
}

function retrieveSchema(schema, definitions = {}, formData = {}) {
    let resolvedSchema = resolveSchema(schema, definitions, formData);
    if ("allOf" in schema) {
        try {
            resolvedSchema = mergeAllOf({
                ...resolvedSchema,
                allOf: resolvedSchema.allOf,
            });
        } catch (e) {
            console.warn("could not merge subschemas in allOf:\n" + e);
            const { allOf, ...resolvedSchemaWithoutAllOf } = resolvedSchema;
            return resolvedSchemaWithoutAllOf;
        }
    }
    const hasAdditionalProperties =
        resolvedSchema.hasOwnProperty("additionalProperties") &&
        resolvedSchema.additionalProperties !== false;
    if (hasAdditionalProperties) {
        return stubExistingAdditionalProperties(
            resolvedSchema,
            definitions,
            formData
        );
    }
    return resolvedSchema;
}

function resolveDependencies(schema, definitions, formData) {
    // Drop the dependencies from the source schema.
    let { dependencies = {}, ...resolvedSchema } = schema;
    if ("oneOf" in resolvedSchema) {
        resolvedSchema =
            resolvedSchema.oneOf[
            getMatchingOption(formData, resolvedSchema.oneOf, definitions)
            ];
    } else if ("anyOf" in resolvedSchema) {
        resolvedSchema =
            resolvedSchema.anyOf[
            getMatchingOption(formData, resolvedSchema.anyOf, definitions)
            ];
    }
    return processDependencies(
        dependencies,
        resolvedSchema,
        definitions,
        formData
    );
}
function processDependencies(
    dependencies,
    resolvedSchema,
    definitions,
    formData
) {
    // Process dependencies updating the local schema properties as appropriate.
    for (const dependencyKey in dependencies) {
        // Skip this dependency if its trigger property is not present.
        if (formData[dependencyKey] === undefined) {
            continue;
        }
        // Skip this dependency if it is not included in the schema (such as when dependencyKey is itself a hidden dependency.)
        if (
            resolvedSchema.properties &&
            !(dependencyKey in resolvedSchema.properties)
        ) {
            continue;
        }
        const {
            [dependencyKey]: dependencyValue,
            ...remainingDependencies
        } = dependencies;
        if (Array.isArray(dependencyValue)) {
            resolvedSchema = withDependentProperties(resolvedSchema, dependencyValue);
        } else if (isObject(dependencyValue)) {
            resolvedSchema = withDependentSchema(
                resolvedSchema,
                definitions,
                formData,
                dependencyKey,
                dependencyValue
            );
        }
        return processDependencies(
            remainingDependencies,
            resolvedSchema,
            definitions,
            formData
        );
    }
    return resolvedSchema;
}

function withDependentProperties(schema, additionallyRequired) {
    if (!additionallyRequired) {
        return schema;
    }
    const required = Array.isArray(schema.required)
        ? Array.from(new Set([...schema.required, ...additionallyRequired]))
        : additionallyRequired;
    return { ...schema, required: required };
}

function withDependentSchema(
    schema,
    definitions,
    formData,
    dependencyKey,
    dependencyValue
) {
    let { oneOf, ...dependentSchema } = retrieveSchema(
        dependencyValue,
        definitions,
        formData
    );
    schema = mergeSchemas(schema, dependentSchema);
    // Since it does not contain oneOf, we return the original schema.
    if (oneOf === undefined) {
        return schema;
    } else if (!Array.isArray(oneOf)) {
        throw new Error(`invalid: it is some ${typeof oneOf} instead of an array`);
    }
    // Resolve $refs inside oneOf.
    const resolvedOneOf = oneOf.map(subschema =>
        subschema.hasOwnProperty("$ref")
            ? resolveReference(subschema, definitions, formData)
            : subschema
    );
    return withExactlyOneSubschema(
        schema,
        definitions,
        formData,
        dependencyKey,
        resolvedOneOf
    );
}

function withExactlyOneSubschema(
    schema,
    definitions,
    formData,
    dependencyKey,
    oneOf
) {
    const validSubschemas = oneOf.filter(subschema => {
        if (!subschema.properties) {
            return false;
        }
        const { [dependencyKey]: conditionPropertySchema } = subschema.properties;
        if (conditionPropertySchema) {
            const conditionSchema = {
                type: "object",
                properties: {
                    [dependencyKey]: conditionPropertySchema,
                },
            };
            const { errors } = validateFormData(formData, conditionSchema);
            return errors.length === 0;
        }
    });
    if (validSubschemas.length !== 1) {
        console.warn(
            "ignoring oneOf in dependencies because there isn't exactly one subschema that is valid"
        );
        return schema;
    }
    const subschema = validSubschemas[0];
    const {
        [dependencyKey]: conditionPropertySchema,
        ...dependentSubschema
    } = subschema.properties;
    const dependentSchema = { ...subschema, properties: dependentSubschema };
    return mergeSchemas(
        schema,
        retrieveSchema(dependentSchema, definitions, formData)
    );
}

// Recursively merge deeply nested schemas.
// The difference between mergeSchemas and mergeObjects
// is that mergeSchemas only concats arrays for
// values under the "required" keyword, and when it does,
// it doesn't include duplicate values.
function mergeSchemas(obj1, obj2) {
    var acc = Object.assign({}, obj1); // Prevent mutation of source object.
    return Object.keys(obj2).reduce((acc, key) => {
        const left = obj1 ? obj1[key] : {},
            right = obj2[key];
        if (obj1 && obj1.hasOwnProperty(key) && isObject(right)) {
            acc[key] = mergeSchemas(left, right);
        } else if (
            obj1 &&
            obj2 &&
            (getSchemaType(obj1) === "object" || getSchemaType(obj2) === "object") &&
            key === "required" &&
            Array.isArray(left) &&
            Array.isArray(right)
        ) {
            // Don't include duplicate values when merging
            // "required" fields.
            acc[key] = union(left, right);
        } else {
            acc[key] = right;
        }
        return acc;
    }, acc);
}

function isArguments(object) {
    return Object.prototype.toString.call(object) === "[object Arguments]";
}

function deepEquals(a, b, ca = [], cb = []) {
    // Partially extracted from node-deeper and adapted to exclude comparison
    // checks for functions.
    // https://github.com/othiym23/node-deeper
    if (a === b) {
        return true;
    } else if (typeof a === "function" || typeof b === "function") {
        // Assume all functions are equivalent
        // see https://github.com/mozilla-services/react-jsonschema-form/issues/255
        return true;
    } else if (typeof a !== "object" || typeof b !== "object") {
        return false;
    } else if (a === null || b === null) {
        return false;
    } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    } else if (a instanceof RegExp && b instanceof RegExp) {
        return (
            a.source === b.source &&
            a.global === b.global &&
            a.multiline === b.multiline &&
            a.lastIndex === b.lastIndex &&
            a.ignoreCase === b.ignoreCase
        );
    } else if (isArguments(a) || isArguments(b)) {
        if (!(isArguments(a) && isArguments(b))) {
            return false;
        }
        let slice = Array.prototype.slice;
        return deepEquals(slice.call(a), slice.call(b), ca, cb);
    } else {
        if (a.constructor !== b.constructor) {
            return false;
        }

        let ka = Object.keys(a);
        let kb = Object.keys(b);
        // don't bother with stack acrobatics if there's nothing there
        if (ka.length === 0 && kb.length === 0) {
            return true;
        }
        if (ka.length !== kb.length) {
            return false;
        }

        let cal = ca.length;
        while (cal--) {
            if (ca[cal] === a) {
                return cb[cal] === b;
            }
        }
        ca.push(a);
        cb.push(b);

        ka.sort();
        kb.sort();
        for (var j = ka.length - 1; j >= 0; j--) {
            if (ka[j] !== kb[j]) {
                return false;
            }
        }

        let key;
        for (let k = ka.length - 1; k >= 0; k--) {
            key = ka[k];
            if (!deepEquals(a[key], b[key], ca, cb)) {
                return false;
            }
        }

        ca.pop();
        cb.pop();

        return true;
    }
}

function shouldRender(comp, nextProps, nextState) {
    const { props, state } = comp;
    return !deepEquals(props, nextProps) || !deepEquals(state, nextState);
}

function toIdSchema(
    schema,
    id,
    definitions,
    formData = {},
    idPrefix = "root"
) {
    const idSchema = {
        $id: id || idPrefix,
    };
    if ("$ref" in schema || "dependencies" in schema || "allOf" in schema) {
        const _schema = retrieveSchema(schema, definitions, formData);
        return toIdSchema(_schema, id, definitions, formData, idPrefix);
    }
    if ("items" in schema && !schema.items.$ref) {
        return toIdSchema(schema.items, id, definitions, formData, idPrefix);
    }
    if (schema.type !== "object") {
        return idSchema;
    }
    for (const name in schema.properties || {}) {
        const field = schema.properties[name];
        const fieldId = idSchema.$id + "_" + name;
        idSchema[name] = toIdSchema(
            field,
            fieldId,
            definitions,
            // It's possible that formData is not an object -- this can happen if an
            // array item has just been added, but not populated with data yet
            (formData || {})[name],
            idPrefix
        );
    }
    return idSchema;
}

function toPathSchema(schema, name = "", definitions, formData = {}) {
    const pathSchema = {
        $name: name.replace(/^\./, ""),
    };
    if ("$ref" in schema || "dependencies" in schema || "allOf" in schema) {
        const _schema = retrieveSchema(schema, definitions, formData);
        return toPathSchema(_schema, name, definitions, formData);
    }
    if (schema.hasOwnProperty("items") && Array.isArray(formData)) {
        formData.forEach((element, i) => {
            pathSchema[i] = toPathSchema(
                schema.items,
                `${name}.${i}`,
                definitions,
                element
            );
        });
    } else if (schema.hasOwnProperty("properties")) {
        for (const property in schema.properties) {
            pathSchema[property] = toPathSchema(
                schema.properties[property],
                `${name}.${property}`,
                definitions,
                // It's possible that formData is not an object -- this can happen if an
                // array item has just been added, but not populated with data yet
                (formData || {})[property]
            );
        }
    }
    return pathSchema;
}

function parseDateString(dateString, includeTime = true) {
    if (!dateString) {
        return {
            year: -1,
            month: -1,
            day: -1,
            hour: includeTime ? -1 : 0,
            minute: includeTime ? -1 : 0,
            second: includeTime ? -1 : 0,
        };
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        throw new Error("Unable to parse date " + dateString);
    }
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1, // oh you, javascript.
        day: date.getUTCDate(),
        hour: includeTime ? date.getUTCHours() : 0,
        minute: includeTime ? date.getUTCMinutes() : 0,
        second: includeTime ? date.getUTCSeconds() : 0,
    };
}

function toDateString(
    { year, month, day, hour = 0, minute = 0, second = 0 },
    time = true
) {
    const utcTime = Date.UTC(year, month - 1, day, hour, minute, second);
    const datetime = new Date(utcTime).toJSON();
    return time ? datetime : datetime.slice(0, 10);
}

function pad(num, size) {
    let s = String(num);
    while (s.length < size) {
        s = "0" + s;
    }
    return s;
}

function dataURItoBlob(dataURI) {
    // Split metadata from data
    const splitted = dataURI.split(",");
    // Split params
    const params = splitted[0].split(";");
    // Get mime-type from params
    const type = params[0].replace("data:", "");
    // Filter the name property from params
    const properties = params.filter(param => {
        return param.split("=")[0] === "name";
    });
    // Look for the name and use unknown if no name property.
    let name;
    if (properties.length !== 1) {
        name = "unknown";
    } else {
        // Because we filtered out the other property,
        // we only have the name case here.
        name = properties[0].split("=")[1];
    }

    // Built the Uint8Array Blob parameter from the base64 string.
    const binary = atob(splitted[1]);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    // Create the blob object
    const blob = new window.Blob([new Uint8Array(array)], { type });

    return { blob, name };
}

function rangeSpec(schema) {
    const spec = {};
    if (schema.multipleOf) {
        spec.step = schema.multipleOf;
    }
    if (schema.minimum || schema.minimum === 0) {
        spec.min = schema.minimum;
    }
    if (schema.maximum || schema.maximum === 0) {
        spec.max = schema.maximum;
    }
    return spec;
}

function getMatchingOption(formData, options, definitions) {
    for (let i = 0; i < options.length; i++) {
        // Assign the definitions to the option, otherwise the match can fail if
        // the new option uses a $ref
        const option = Object.assign(
            {
                definitions,
            },
            options[i]
        );

        // If the schema describes an object then we need to add slightly more
        // strict matching to the schema, because unless the schema uses the
        // "requires" keyword, an object will match the schema as long as it
        // doesn't have matching keys with a conflicting type. To do this we use an
        // "anyOf" with an array of requires. This augmentation expresses that the
        // schema should match if any of the keys in the schema are present on the
        // object and pass validation.
        if (option.properties) {
            // Create an "anyOf" schema that requires at least one of the keys in the
            // "properties" object
            const requiresAnyOf = {
                anyOf: Object.keys(option.properties).map(key => ({
                    required: [key],
                })),
            };

            let augmentedSchema;

            // If the "anyOf" keyword already exists, wrap the augmentation in an "allOf"
            if (option.anyOf) {
                // Create a shallow clone of the option
                const { ...shallowClone } = option;

                if (!shallowClone.allOf) {
                    shallowClone.allOf = [];
                } else {
                    // If "allOf" already exists, shallow clone the array
                    shallowClone.allOf = shallowClone.allOf.slice();
                }

                shallowClone.allOf.push(requiresAnyOf);

                augmentedSchema = shallowClone;
            } else {
                augmentedSchema = Object.assign({}, option, requiresAnyOf);
            }

            // Remove the "required" field as it's likely that not all fields have
            // been filled in yet, which will mean that the schema is not valid
            delete augmentedSchema.required;

            if (isValid(augmentedSchema, formData)) {
                return i;
            }
        } else if (isValid(options[i], formData)) {
            return i;
        }
    }
    return 0;
}

class MultiSchemaField extends React.Component {
    constructor(props) {
        super(props);

        const { formData, options } = this.props;

        this.state = {
            selectedOption: this.getMatchingOption(formData, options),
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (
            !deepEquals(this.props.formData, prevProps.formData) &&
            this.props.idSchema.$id === prevProps.idSchema.$id
        ) {
            const matchingOption = this.getMatchingOption(
                this.props.formData,
                this.props.options
            );

            if (!prevState || matchingOption === this.state.selectedOption) {
                return;
            }

            this.setState({
                selectedOption: matchingOption,
            });
        }
    }

    getMatchingOption(formData, options) {
        const { definitions } = this.props.registry;

        let option = getMatchingOption(formData, options, definitions);
        if (option !== 0) {
            return option;
        }
        // If the form data matches none of the options, use the currently selected
        // option, assuming it's available; otherwise use the first option
        return this && this.state ? this.state.selectedOption : 0;
    }

    onOptionChange = option => {
        const selectedOption = parseInt(option, 10);
        const { formData, onChange, options, registry } = this.props;
        const { definitions } = registry;
        const newOption = retrieveSchema(
            options[selectedOption],
            definitions,
            formData
        );

        // If the new option is of type object and the current data is an object,
        // discard properties added using the old option.
        let newFormData = undefined;
        if (
            guessType(formData) === "object" &&
            (newOption.type === "object" || newOption.properties)
        ) {
            newFormData = Object.assign({}, formData);

            const optionsToDiscard = options.slice();
            optionsToDiscard.splice(selectedOption, 1);

            // Discard any data added using other options
            for (const option of optionsToDiscard) {
                if (option.properties) {
                    for (const key in option.properties) {
                        if (newFormData.hasOwnProperty(key)) {
                            delete newFormData[key];
                        }
                    }
                }
            }
        }
        // Call getDefaultFormState to make sure defaults are populated on change.
        onChange(
            getDefaultFormState(options[selectedOption], newFormData, definitions)
        );

        this.setState({
            selectedOption: parseInt(option, 10),
        });
    };

    render() {
        const {
            baseType,
            disabled,
            errorSchema,
            formData,
            idPrefix,
            idSchema,
            onBlur,
            onChange,
            onFocus,
            options,
            registry,
            uiSchema,
            schema,
        } = this.props;

        const _SchemaField = registry.fields.SchemaField;
        const { widgets } = registry;
        const { selectedOption } = this.state;
        const { widget = "select", ...uiOptions } = getUiOptions(uiSchema);
        const Widget = getWidget({ type: "number" }, widget, widgets);

        const option = options[selectedOption] || null;
        let optionSchema;

        if (option) {
            // If the subschema doesn't declare a type, infer the type from the
            // parent schema
            optionSchema = option.type
                ? option
                : Object.assign({}, option, { type: baseType });
        }

        const enumOptions = options.map((option, index) => ({
            label: option.title || `Option ${index + 1}`,
            value: index,
        }));

        return (
            <div className="panel panel-default panel-body">
                <div className="form-group">
                    <Widget
                        id={`${idSchema.$id}${
                            schema.oneOf ? "__oneof_select" : "__anyof_select"
                            }`}
                        schema={{ type: "number", default: 0 }}
                        onChange={this.onOptionChange}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        value={selectedOption}
                        options={{ enumOptions }}
                        {...uiOptions}
                    />
                </div>

                {option !== null && (
                    <_SchemaField
                        schema={optionSchema}
                        uiSchema={uiSchema}
                        errorSchema={errorSchema}
                        idSchema={idSchema}
                        idPrefix={idPrefix}
                        formData={formData}
                        onChange={onChange}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        registry={registry}
                        disabled={disabled}
                    />
                )}
            </div>
        );
    }
}

MultiSchemaField.defaultProps = {
    disabled: false,
    errorSchema: {},
    idSchema: {},
    uiSchema: {},
};

function ArrayFieldTitle({ TitleField, idSchema, title, required }) {
    if (!title) {
        return null;
    }
    const id = `${idSchema.$id}__title`;
    return <TitleField id={id} title={title} required={required} />;
}

function ArrayFieldDescription({ DescriptionField, idSchema, description }) {
    if (!description) {
        return null;
    }
    const id = `${idSchema.$id}__description`;
    return <DescriptionField id={id} description={description} />;
}

// Used in the two templates
function DefaultArrayItem(props) {
    const btnStyle = {
        flex: 1,
        paddingLeft: 6,
        paddingRight: 6,
        fontWeight: "bold",
    };
    return (
        <div key={props.key} className={props.className}>
            <div className={props.hasToolbar ? "col-xs-9" : "col-xs-12"}>
                {props.children}
            </div>

            {props.hasToolbar && (
                <div className="col-xs-3 array-item-toolbox">
                    <div
                        className="btn-group"
                        style={{
                            display: "flex",
                            justifyContent: "space-around",
                        }}>
                        {(props.hasMoveUp || props.hasMoveDown) && (
                            <IconButton
                                icon="arrow-up"
                                className="array-item-move-up"
                                tabIndex="-1"
                                style={btnStyle}
                                disabled={props.disabled || props.readonly || !props.hasMoveUp}
                                onClick={props.onReorderClick(props.index, props.index - 1)}
                            />
                        )}

                        {(props.hasMoveUp || props.hasMoveDown) && (
                            <IconButton
                                icon="arrow-down"
                                className="array-item-move-down"
                                tabIndex="-1"
                                style={btnStyle}
                                disabled={
                                    props.disabled || props.readonly || !props.hasMoveDown
                                }
                                onClick={props.onReorderClick(props.index, props.index + 1)}
                            />
                        )}

                        {props.hasRemove && (
                            <IconButton
                                type="danger"
                                icon="remove"
                                className="array-item-remove"
                                tabIndex="-1"
                                style={btnStyle}
                                disabled={props.disabled || props.readonly}
                                onClick={props.onDropIndexClick(props.index)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DefaultFixedArrayFieldTemplate(props) {
    return (
        <fieldset className={props.className} id={props.idSchema.$id}>
            <ArrayFieldTitle
                key={`array-field-title-${props.idSchema.$id}`}
                TitleField={props.TitleField}
                idSchema={props.idSchema}
                title={props.uiSchema["ui:title"] || props.title}
                required={props.required}
            />

            {(props.uiSchema["ui:description"] || props.schema.description) && (
                <div
                    className="field-description"
                    key={`field-description-${props.idSchema.$id}`}>
                    {props.uiSchema["ui:description"] || props.schema.description}
                </div>
            )}

            <div
                className="row array-item-list"
                key={`array-item-list-${props.idSchema.$id}`}>
                {props.items && props.items.map(DefaultArrayItem)}
            </div>

            {props.canAdd && (
                <AddButton
                    className="array-item-add"
                    onClick={props.onAddClick}
                    disabled={props.disabled || props.readonly}
                />
            )}
        </fieldset>
    );
}

function DefaultNormalArrayFieldTemplate(props) {
    return (
        <fieldset className={props.className} id={props.idSchema.$id}>
            <ArrayFieldTitle
                key={`array-field-title-${props.idSchema.$id}`}
                TitleField={props.TitleField}
                idSchema={props.idSchema}
                title={props.uiSchema["ui:title"] || props.title}
                required={props.required}
            />

            {(props.uiSchema["ui:description"] || props.schema.description) && (
                <ArrayFieldDescription
                    key={`array-field-description-${props.idSchema.$id}`}
                    DescriptionField={props.DescriptionField}
                    idSchema={props.idSchema}
                    description={
                        props.uiSchema["ui:description"] || props.schema.description
                    }
                />
            )}

            <div
                className="row array-item-list"
                key={`array-item-list-${props.idSchema.$id}`}>
                {props.items && props.items.map(p => DefaultArrayItem(p))}
            </div>

            {props.canAdd && (
                <AddButton
                    className="array-item-add"
                    onClick={props.onAddClick}
                    disabled={props.disabled || props.readonly}
                />
            )}
        </fieldset>
    );
}

function generateRowId() {
    return shortid.generate();
}

function generateKeyedFormData(formData) {
    return !Array.isArray(formData)
        ? []
        : formData.map(item => {
            return {
                key: generateRowId(),
                item,
            };
        });
}

function keyedToPlainFormData(keyedFormData) {
    return keyedFormData.map(keyedItem => keyedItem.item);
}

class ArrayField extends React.Component {
    static defaultProps = {
        uiSchema: {},
        formData: [],
        idSchema: {},
        required: false,
        disabled: false,
        readonly: false,
        autofocus: false,
    };

    constructor(props) {
        super(props);
        const { formData } = props;
        const keyedFormData = generateKeyedFormData(formData);
        this.state = {
            keyedFormData,
            updatedKeyedFormData: false,
        };
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        // Don't call getDerivedStateFromProps if keyed formdata was just updated.
        if (prevState.updatedKeyedFormData) {
            return {
                updatedKeyedFormData: false,
            };
        }
        const nextFormData = nextProps.formData;
        const previousKeyedFormData = prevState.keyedFormData;
        const newKeyedFormData =
            nextFormData.length === previousKeyedFormData.length
                ? previousKeyedFormData.map((previousKeyedFormDatum, index) => {
                    return {
                        key: previousKeyedFormDatum.key,
                        item: nextFormData[index],
                    };
                })
                : generateKeyedFormData(nextFormData);
        return {
            keyedFormData: newKeyedFormData,
        };
    }

    get itemTitle() {
        const { schema } = this.props;
        return schema.items.title || schema.items.description || "Item";
    }

    isItemRequired(itemSchema) {
        if (Array.isArray(itemSchema.type)) {
            // While we don't yet support composite/nullable jsonschema types, it's
            // future-proof to check for requirement against these.
            return !includes(itemSchema.type, "null");
        }
        // All non-null array item types are inherently required by design
        return itemSchema.type !== "null";
    }

    canAddItem(formItems) {
        const { schema, uiSchema } = this.props;
        let { addable } = getUiOptions(uiSchema);
        if (addable !== false) {
            // if ui:options.addable was not explicitly set to false, we can add
            // another item if we have not exceeded maxItems yet
            if (schema.maxItems !== undefined) {
                addable = formItems.length < schema.maxItems;
            } else {
                addable = true;
            }
        }
        return addable;
    }

    _getNewFormDataRow = () => {
        const { schema, registry = getDefaultRegistry() } = this.props;
        const { definitions } = registry;
        let itemSchema = schema.items;
        if (isFixedItems(schema) && allowAdditionalItems(schema)) {
            itemSchema = schema.additionalItems;
        }
        return getDefaultFormState(itemSchema, undefined, definitions);
    };

    onAddClick = event => {
        event.preventDefault();

        const { onChange } = this.props;
        const newKeyedFormDataRow = {
            key: generateRowId(),
            item: this._getNewFormDataRow(),
        };
        const newKeyedFormData = [...this.state.keyedFormData, newKeyedFormDataRow];
        this.setState(
            {
                keyedFormData: newKeyedFormData,
                updatedKeyedFormData: true,
            },
            () => onChange(keyedToPlainFormData(newKeyedFormData))
        );
    };

    onAddIndexClick = index => {
        return event => {
            if (event) {
                event.preventDefault();
            }
            const { onChange } = this.props;
            const newKeyedFormDataRow = {
                key: generateRowId(),
                item: this._getNewFormDataRow(),
            };
            let newKeyedFormData = [...this.state.keyedFormData];
            newKeyedFormData.splice(index, 0, newKeyedFormDataRow);

            this.setState(
                {
                    keyedFormData: newKeyedFormData,
                    updatedKeyedFormData: true,
                },
                () => onChange(keyedToPlainFormData(newKeyedFormData))
            );
        };
    };

    onDropIndexClick = index => {
        return event => {
            if (event) {
                event.preventDefault();
            }
            const { onChange } = this.props;
            const { keyedFormData } = this.state;
            // refs #195: revalidate to ensure properly reindexing errors
            let newErrorSchema;
            if (this.props.errorSchema) {
                newErrorSchema = {};
                const errorSchema = this.props.errorSchema;
                for (let i in errorSchema) {
                    i = parseInt(i);
                    if (i < index) {
                        newErrorSchema[i] = errorSchema[i];
                    } else if (i > index) {
                        newErrorSchema[i - 1] = errorSchema[i];
                    }
                }
            }
            const newKeyedFormData = keyedFormData.filter((_, i) => i !== index);
            this.setState(
                {
                    keyedFormData: newKeyedFormData,
                    updatedKeyedFormData: true,
                },
                () => onChange(keyedToPlainFormData(newKeyedFormData), newErrorSchema)
            );
        };
    };

    onReorderClick = (index, newIndex) => {
        return event => {
            if (event) {
                event.preventDefault();
                event.target.blur();
            }
            const { onChange } = this.props;
            let newErrorSchema;
            if (this.props.errorSchema) {
                newErrorSchema = {};
                const errorSchema = this.props.errorSchema;
                for (let i in errorSchema) {
                    if (i == index) {
                        newErrorSchema[newIndex] = errorSchema[index];
                    } else if (i == newIndex) {
                        newErrorSchema[index] = errorSchema[newIndex];
                    } else {
                        newErrorSchema[i] = errorSchema[i];
                    }
                }
            }

            const { keyedFormData } = this.state;
            function reOrderArray() {
                // Copy item
                let _newKeyedFormData = keyedFormData.slice();

                // Moves item from index to newIndex
                _newKeyedFormData.splice(index, 1);
                _newKeyedFormData.splice(newIndex, 0, keyedFormData[index]);

                return _newKeyedFormData;
            }
            const newKeyedFormData = reOrderArray();
            this.setState(
                {
                    keyedFormData: newKeyedFormData,
                },
                () => onChange(keyedToPlainFormData(newKeyedFormData), newErrorSchema)
            );
        };
    };

    onChangeForIndex = index => {
        return (value, errorSchema) => {
            const { formData, onChange } = this.props;
            const newFormData = formData.map((item, i) => {
                // We need to treat undefined items as nulls to have validation.
                // See https://github.com/tdegrunt/jsonschema/issues/206
                const jsonValue = typeof value === "undefined" ? null : value;
                return index === i ? jsonValue : item;
            });
            onChange(
                newFormData,
                errorSchema &&
                this.props.errorSchema && {
                    ...this.props.errorSchema,
                    [index]: errorSchema,
                }
            );
        };
    };

    onSelectChange = value => {
        this.props.onChange(value);
    };

    render() {
        const {
            schema,
            uiSchema,
            idSchema,
            registry = getDefaultRegistry(),
        } = this.props;
        const { definitions } = registry;
        if (!schema.hasOwnProperty("items")) {
            return (
                <UnsupportedField
                    schema={schema}
                    idSchema={idSchema}
                    reason="Missing items definition"
                />
            );
        }
        if (isFixedItems(schema)) {
            return this.renderFixedArray();
        }
        if (isFilesArray(schema, uiSchema, definitions)) {
            return this.renderFiles();
        }
        if (isMultiSelect(schema, definitions)) {
            return this.renderMultiSelect();
        }
        return this.renderNormalArray();
    }

    renderNormalArray() {
        const {
            schema,
            uiSchema,
            formData,
            errorSchema,
            idSchema,
            name,
            required,
            disabled,
            readonly,
            autofocus,
            registry = getDefaultRegistry(),
            onBlur,
            onFocus,
            idPrefix,
            rawErrors,
        } = this.props;
        const title = schema.title === undefined ? name : schema.title;
        const { ArrayFieldTemplate, definitions, fields, formContext } = registry;
        const { TitleField, DescriptionField } = fields;
        const itemsSchema = retrieveSchema(schema.items, definitions);
        const arrayProps = {
            canAdd: this.canAddItem(formData),
            items: this.state.keyedFormData.map((keyedItem, index) => {
                const { key, item } = keyedItem;
                const itemSchema = retrieveSchema(schema.items, definitions, item);
                const itemErrorSchema = errorSchema ? errorSchema[index] : undefined;
                const itemIdPrefix = idSchema.$id + "_" + index;
                const itemIdSchema = toIdSchema(
                    itemSchema,
                    itemIdPrefix,
                    definitions,
                    item,
                    idPrefix
                );
                return this.renderArrayFieldItem({
                    key,
                    index,
                    canMoveUp: index > 0,
                    canMoveDown: index < formData.length - 1,
                    itemSchema: itemSchema,
                    itemIdSchema,
                    itemErrorSchema,
                    itemData: item,
                    itemUiSchema: uiSchema.items,
                    autofocus: autofocus && index === 0,
                    onBlur,
                    onFocus,
                });
            }),
            className: `field field-array field-array-of-${itemsSchema.type}`,
            DescriptionField,
            disabled,
            idSchema,
            uiSchema,
            onAddClick: this.onAddClick,
            readonly,
            required,
            schema,
            title,
            TitleField,
            formContext,
            formData,
            rawErrors,
            registry,
        };

        // Check if a custom render function was passed in
        const Component =
            uiSchema["ui:ArrayFieldTemplate"] ||
            ArrayFieldTemplate ||
            DefaultNormalArrayFieldTemplate;
        return <Component {...arrayProps} />;
    }

    renderMultiSelect() {
        const {
            schema,
            idSchema,
            uiSchema,
            formData,
            disabled,
            readonly,
            required,
            label,
            placeholder,
            autofocus,
            onBlur,
            onFocus,
            registry = getDefaultRegistry(),
            rawErrors,
        } = this.props;
        const items = this.props.formData;
        const { widgets, definitions, formContext } = registry;
        const itemsSchema = retrieveSchema(schema.items, definitions, formData);
        const enumOptions = optionsList(itemsSchema);
        const { widget = "select", ...options } = {
            ...getUiOptions(uiSchema),
            enumOptions,
        };
        const Widget = getWidget(schema, widget, widgets);
        return (
            <Widget
                id={idSchema && idSchema.$id}
                multiple
                onChange={this.onSelectChange}
                onBlur={onBlur}
                onFocus={onFocus}
                options={options}
                schema={schema}
                registry={registry}
                value={items}
                disabled={disabled}
                readonly={readonly}
                required={required}
                label={label}
                placeholder={placeholder}
                formContext={formContext}
                autofocus={autofocus}
                rawErrors={rawErrors}
            />
        );
    }

    renderFiles() {
        const {
            schema,
            uiSchema,
            idSchema,
            name,
            disabled,
            readonly,
            autofocus,
            onBlur,
            onFocus,
            registry = getDefaultRegistry(),
            rawErrors,
        } = this.props;
        const title = schema.title || name;
        const items = this.props.formData;
        const { widgets, formContext } = registry;
        const { widget = "files", ...options } = getUiOptions(uiSchema);
        const Widget = getWidget(schema, widget, widgets);
        return (
            <Widget
                options={options}
                id={idSchema && idSchema.$id}
                multiple
                onChange={this.onSelectChange}
                onBlur={onBlur}
                onFocus={onFocus}
                schema={schema}
                title={title}
                value={items}
                disabled={disabled}
                readonly={readonly}
                formContext={formContext}
                autofocus={autofocus}
                rawErrors={rawErrors}
            />
        );
    }

    renderFixedArray() {
        const {
            schema,
            uiSchema,
            formData,
            errorSchema,
            idPrefix,
            idSchema,
            name,
            required,
            disabled,
            readonly,
            autofocus,
            registry = getDefaultRegistry(),
            onBlur,
            onFocus,
            rawErrors,
        } = this.props;
        const title = schema.title || name;
        let items = this.props.formData;
        const { ArrayFieldTemplate, definitions, fields, formContext } = registry;
        const { TitleField } = fields;
        const itemSchemas = schema.items.map((item, index) =>
            retrieveSchema(item, definitions, formData[index])
        );
        const additionalSchema = allowAdditionalItems(schema)
            ? retrieveSchema(schema.additionalItems, definitions, formData)
            : null;

        if (!items || items.length < itemSchemas.length) {
            // to make sure at least all fixed items are generated
            items = items || [];
            items = items.concat(new Array(itemSchemas.length - items.length));
        }

        // These are the props passed into the render function
        const arrayProps = {
            canAdd: this.canAddItem(items) && additionalSchema,
            className: "field field-array field-array-fixed-items",
            disabled,
            idSchema,
            formData,
            items: this.state.keyedFormData.map((keyedItem, index) => {
                const { key, item } = keyedItem;
                const additional = index >= itemSchemas.length;
                const itemSchema = additional
                    ? retrieveSchema(schema.additionalItems, definitions, item)
                    : itemSchemas[index];
                const itemIdPrefix = idSchema.$id + "_" + index;
                const itemIdSchema = toIdSchema(
                    itemSchema,
                    itemIdPrefix,
                    definitions,
                    item,
                    idPrefix
                );
                const itemUiSchema = additional
                    ? uiSchema.additionalItems || {}
                    : Array.isArray(uiSchema.items)
                        ? uiSchema.items[index]
                        : uiSchema.items || {};
                const itemErrorSchema = errorSchema ? errorSchema[index] : undefined;

                return this.renderArrayFieldItem({
                    key,
                    index,
                    canRemove: additional,
                    canMoveUp: index >= itemSchemas.length + 1,
                    canMoveDown: additional && index < items.length - 1,
                    itemSchema,
                    itemData: item,
                    itemUiSchema,
                    itemIdSchema,
                    itemErrorSchema,
                    autofocus: autofocus && index === 0,
                    onBlur,
                    onFocus,
                });
            }),
            onAddClick: this.onAddClick,
            readonly,
            required,
            schema,
            uiSchema,
            title,
            TitleField,
            formContext,
            rawErrors,
        };

        // Check if a custom template template was passed in
        const Template =
            uiSchema["ui:ArrayFieldTemplate"] ||
            ArrayFieldTemplate ||
            DefaultFixedArrayFieldTemplate;
        return <Template {...arrayProps} />;
    }

    renderArrayFieldItem(props) {
        const {
            key,
            index,
            canRemove = true,
            canMoveUp = true,
            canMoveDown = true,
            itemSchema,
            itemData,
            itemUiSchema,
            itemIdSchema,
            itemErrorSchema,
            autofocus,
            onBlur,
            onFocus,
            rawErrors,
        } = props;
        const {
            disabled,
            readonly,
            uiSchema,
            registry = getDefaultRegistry(),
        } = this.props;
        const {
            fields: { SchemaField },
        } = registry;
        const { orderable, removable } = {
            orderable: true,
            removable: true,
            ...uiSchema["ui:options"],
        };
        const has = {
            moveUp: orderable && canMoveUp,
            moveDown: orderable && canMoveDown,
            remove: removable && canRemove,
        };
        has.toolbar = Object.keys(has).some(key => has[key]);

        return {
            children: (
                <SchemaField
                    index={index}
                    schema={itemSchema}
                    uiSchema={itemUiSchema}
                    formData={itemData}
                    errorSchema={itemErrorSchema}
                    idSchema={itemIdSchema}
                    required={this.isItemRequired(itemSchema)}
                    onChange={this.onChangeForIndex(index)}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    registry={this.props.registry}
                    disabled={this.props.disabled}
                    readonly={this.props.readonly}
                    autofocus={autofocus}
                    rawErrors={rawErrors}
                />
            ),
            className: "array-item",
            disabled,
            hasToolbar: has.toolbar,
            hasMoveUp: has.moveUp,
            hasMoveDown: has.moveDown,
            hasRemove: has.remove,
            index,
            key,
            onAddIndexClick: this.onAddIndexClick,
            onDropIndexClick: this.onDropIndexClick,
            onReorderClick: this.onReorderClick,
            readonly,
        };
    }
}

function BooleanField(props) {
    const {
        schema,
        name,
        uiSchema,
        idSchema,
        formData,
        registry = getDefaultRegistry(),
        required,
        disabled,
        readonly,
        autofocus,
        onChange,
        onFocus,
        onBlur,
        rawErrors,
    } = props;
    const { title } = schema;
    const { widgets, formContext } = registry;
    const { widget = "checkbox", ...options } = getUiOptions(uiSchema);
    const Widget = getWidget(schema, widget, widgets);

    let enumOptions;

    if (Array.isArray(schema.oneOf)) {
        enumOptions = optionsList({
            oneOf: schema.oneOf.map(option => ({
                ...option,
                title: option.title || (option.const === true ? "Yes" : "No"),
            })),
        });
    } else {
        enumOptions = optionsList({
            enum: schema.enum || [true, false],
            enumNames:
                schema.enumNames ||
                (schema.enum && schema.enum[0] === false
                    ? ["No", "Yes"]
                    : ["Yes", "No"]),
        });
    }

    return (
        <Widget
            options={{ ...options, enumOptions }}
            schema={schema}
            id={idSchema && idSchema.$id}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            label={title === undefined ? name : title}
            value={formData}
            required={required}
            disabled={disabled}
            readonly={readonly}
            registry={registry}
            formContext={formContext}
            autofocus={autofocus}
            rawErrors={rawErrors}
        />
    );
}

BooleanField.defaultProps = {
    uiSchema: {},
    disabled: false,
    readonly: false,
    autofocus: false,
};


function DescriptionField(props) {
    const { id, description } = props;
    if (!description) {
        return null;
    }
    if (typeof description === "string") {
        return (
            <p id={id} className="field-description">
                {description}
            </p>
        );
    } else {
        return (
            <div id={id} className="field-description">
                {description}
            </div>
        );
    }
}


class NullField extends React.Component {
    componentDidMount() {
        if (this.props.formData === undefined) {
            this.props.onChange(null);
        }
    }

    render() {
        return null;
    }
}


// Matches a string that ends in a . character, optionally followed by a sequence of
// digits followed by any number of 0 characters up until the end of the line.
// Ensuring that there is at least one prefixed character is important so that
// you don't incorrectly match against "0".
const trailingCharMatcherWithPrefix = /\.([0-9]*0)*$/;

// This is used for trimming the trailing 0 and . characters without affecting
// the rest of the string. Its possible to use one RegEx with groups for this
// functionality, but it is fairly complex compared to simply defining two
// different matchers.
const trailingCharMatcher = /[0.]0*$/;

/**
 * The NumberField class has some special handling for dealing with trailing
 * decimal points and/or zeroes. This logic is designed to allow trailing values
 * to be visible in the input element, but not be represented in the
 * corresponding form data.
 *
 * The algorithm is as follows:
 *
 * 1. When the input value changes the value is cached in the component state
 *
 * 2. The value is then normalized, removing trailing decimal points and zeros,
 *    then passed to the "onChange" callback
 *
 * 3. When the component is rendered, the formData value is checked against the
 *    value cached in the state. If it matches the cached value, the cached
 *    value is passed to the input instead of the formData value
 */
class NumberField extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            lastValue: props.value,
        };
    }

    handleChange = value => {
        // Cache the original value in component state
        this.setState({ lastValue: value });

        // Normalize decimals that don't start with a zero character in advance so
        // that the rest of the normalization logic is simpler
        if (`${value}`.charAt(0) === ".") {
            value = `0${value}`;
        }

        // Check that the value is a string (this can happen if the widget used is a
        // <select>, due to an enum declaration etc) then, if the value ends in a
        // trailing decimal point or multiple zeroes, strip the trailing values
        let processed =
            typeof value === "string" && value.match(trailingCharMatcherWithPrefix)
                ? asNumber(value.replace(trailingCharMatcher, ""))
                : asNumber(value);

        this.props.onChange(processed);
    };

    render() {
        const { StringField } = this.props.registry.fields;
        const { formData, ...props } = this.props;
        const { lastValue } = this.state;

        let value = formData;

        if (typeof lastValue === "string" && typeof value === "number") {
            // Construct a regular expression that checks for a string that consists
            // of the formData value suffixed with zero or one '.' characters and zero
            // or more '0' characters
            const re = new RegExp(`${value}`.replace(".", "\\.") + "\\.?0*$");

            // If the cached "lastValue" is a match, use that instead of the formData
            // value to prevent the input value from changing in the UI
            if (lastValue.match(re)) {
                value = lastValue;
            }
        }

        return (
            <StringField {...props} formData={value} onChange={this.handleChange} />
        );
    }
}

NumberField.defaultProps = {
    uiSchema: {},
};


function DefaultObjectFieldTemplate(props) {
    const canExpand = function canExpand() {
        const { formData, schema, uiSchema } = props;
        if (!schema.additionalProperties) {
            return false;
        }
        const { expandable } = getUiOptions(uiSchema);
        if (expandable === false) {
            return expandable;
        }
        // if ui:options.expandable was not explicitly set to false, we can add
        // another property if we have not exceeded maxProperties yet
        if (schema.maxProperties !== undefined) {
            return Object.keys(formData).length < schema.maxProperties;
        }
        return true;
    };

    const { TitleField, DescriptionField } = props;
    return (
        <fieldset id={props.idSchema.$id}>
            {(props.uiSchema["ui:title"] || props.title) && (
                <TitleField
                    id={`${props.idSchema.$id}__title`}
                    title={props.title || props.uiSchema["ui:title"]}
                    required={props.required}
                    formContext={props.formContext}
                />
            )}
            {props.description && (
                <DescriptionField
                    id={`${props.idSchema.$id}__description`}
                    description={props.description}
                    formContext={props.formContext}
                />
            )}
            {props.properties.map(prop => prop.content)}
            {canExpand() && (
                <AddButton
                    className="object-property-expand"
                    onClick={props.onAddClick(props.schema)}
                    disabled={props.disabled || props.readonly}
                />
            )}
        </fieldset>
    );
}

class ObjectField extends React.Component {
    static defaultProps = {
        uiSchema: {},
        formData: {},
        errorSchema: {},
        idSchema: {},
        required: false,
        disabled: false,
        readonly: false,
    };

    state = {
        wasPropertyKeyModified: false,
        additionalProperties: {},
    };

    isRequired(name) {
        const schema = this.props.schema;
        return (
            Array.isArray(schema.required) && schema.required.indexOf(name) !== -1
        );
    }

    onPropertyChange = (name, addedByAdditionalProperties = false) => {
        return (value, errorSchema) => {
            if (!value && addedByAdditionalProperties) {
                // Don't set value = undefined for fields added by
                // additionalProperties. Doing so removes them from the
                // formData, which causes them to completely disappear
                // (including the input field for the property name). Unlike
                // fields which are "mandated" by the schema, these fields can
                // be set to undefined by clicking a "delete field" button, so
                // set empty values to the empty string.
                value = "";
            }
            const newFormData = { ...this.props.formData, [name]: value };
            this.props.onChange(
                newFormData,
                errorSchema &&
                this.props.errorSchema && {
                    ...this.props.errorSchema,
                    [name]: errorSchema,
                }
            );
        };
    };

    onDropPropertyClick = key => {
        return event => {
            event.preventDefault();
            const { onChange, formData } = this.props;
            const copiedFormData = { ...formData };
            delete copiedFormData[key];
            onChange(copiedFormData);
        };
    };

    getAvailableKey = (preferredKey, formData) => {
        var index = 0;
        var newKey = preferredKey;
        while (formData.hasOwnProperty(newKey)) {
            newKey = `${preferredKey}-${++index}`;
        }
        return newKey;
    };

    onKeyChange = oldValue => {
        return (value, errorSchema) => {
            if (oldValue === value) {
                return;
            }

            value = this.getAvailableKey(value, this.props.formData);
            const newFormData = { ...this.props.formData };
            const newKeys = { [oldValue]: value };
            const keyValues = Object.keys(newFormData).map(key => {
                const newKey = newKeys[key] || key;
                return { [newKey]: newFormData[key] };
            });
            const renamedObj = Object.assign({}, ...keyValues);

            this.setState({ wasPropertyKeyModified: true });

            this.props.onChange(
                renamedObj,
                errorSchema &&
                this.props.errorSchema && {
                    ...this.props.errorSchema,
                    [value]: errorSchema,
                }
            );
        };
    };

    getDefaultValue(type) {
        switch (type) {
            case "string":
                return "New Value";
            case "array":
                return [];
            case "boolean":
                return false;
            case "null":
                return null;
            case "number":
                return 0;
            case "object":
                return {};
            default:
                // We don't have a datatype for some reason (perhaps additionalProperties was true)
                return "New Value";
        }
    }

    handleAddClick = schema => () => {
        let type = schema.additionalProperties.type;
        const newFormData = { ...this.props.formData };

        if (schema.additionalProperties.hasOwnProperty("$ref")) {
            const { registry = getDefaultRegistry() } = this.props;
            const refSchema = retrieveSchema(
                { $ref: schema.additionalProperties["$ref"] },
                registry.definitions,
                this.props.formData
            );

            type = refSchema.type;
        }

        newFormData[
            this.getAvailableKey("newKey", newFormData)
        ] = this.getDefaultValue(type);

        this.props.onChange(newFormData);
    };

    render() {
        const {
            uiSchema,
            formData,
            errorSchema,
            idSchema,
            name,
            required,
            disabled,
            readonly,
            idPrefix,
            onBlur,
            onFocus,
            registry = getDefaultRegistry(),
        } = this.props;

        const { definitions, fields, formContext } = registry;
        const { SchemaField, TitleField, DescriptionField } = fields;
        const schema = retrieveSchema(this.props.schema, definitions, formData);

        // If this schema has a title defined, but the user has set a new key/label, retain their input.
        let title;
        if (this.state.wasPropertyKeyModified) {
            title = name;
        } else {
            title = schema.title === undefined ? name : schema.title;
        }

        const description = uiSchema["ui:description"] || schema.description;
        let orderedProperties;
        try {
            const properties = Object.keys(schema.properties || {});
            orderedProperties = orderProperties(properties, uiSchema["ui:order"]);
        } catch (err) {
            return (
                <div>
                    <p className="config-error" style={{ color: "red" }}>
                        Invalid {name || "root"} object field configuration:
              <em>{err.message}</em>.
            </p>
                    <pre>{JSON.stringify(schema)}</pre>
                </div>
            );
        }

        const Template =
            uiSchema["ui:ObjectFieldTemplate"] ||
            registry.ObjectFieldTemplate ||
            DefaultObjectFieldTemplate;

        const templateProps = {
            title: uiSchema["ui:title"] || title,
            description,
            TitleField,
            DescriptionField,
            properties: orderedProperties.map(name => {
                const addedByAdditionalProperties = schema.properties[
                    name
                ].hasOwnProperty(ADDITIONAL_PROPERTY_FLAG);
                return {
                    content: (
                        <SchemaField
                            key={name}
                            name={name}
                            required={this.isRequired(name)}
                            schema={schema.properties[name]}
                            uiSchema={
                                addedByAdditionalProperties
                                    ? uiSchema.additionalProperties
                                    : uiSchema[name]
                            }
                            errorSchema={errorSchema[name]}
                            idSchema={idSchema[name]}
                            idPrefix={idPrefix}
                            formData={(formData || {})[name]}
                            wasPropertyKeyModified={this.state.wasPropertyKeyModified}
                            onKeyChange={this.onKeyChange(name)}
                            onChange={this.onPropertyChange(
                                name,
                                addedByAdditionalProperties
                            )}
                            onBlur={onBlur}
                            onFocus={onFocus}
                            registry={registry}
                            disabled={disabled}
                            readonly={readonly}
                            onDropPropertyClick={this.onDropPropertyClick}
                        />
                    ),
                    name,
                    readonly,
                    disabled,
                    required,
                };
            }),
            readonly,
            disabled,
            required,
            idSchema,
            uiSchema,
            schema,
            formData,
            formContext,
        };
        return <Template {...templateProps} onAddClick={this.handleAddClick} />;
    }
}


const REQUIRED_FIELD_SYMBOL = "*";
const COMPONENT_TYPES = {
    array: "ArrayField",
    boolean: "BooleanField",
    integer: "NumberField",
    number: "NumberField",
    object: "ObjectField",
    string: "StringField",
    null: "NullField",
};

function getFieldComponent(schema, uiSchema, idSchema, fields) {
    const field = uiSchema["ui:field"];
    if (typeof field === "function") {
        return field;
    }
    if (typeof field === "string" && field in fields) {
        return fields[field];
    }

    const componentName = COMPONENT_TYPES[getSchemaType(schema)];

    // If the type is not defined and the schema uses 'anyOf' or 'oneOf', don't
    // render a field and let the MultiSchemaField component handle the form display
    if (!componentName && (schema.anyOf || schema.oneOf)) {
        return () => null;
    }

    return componentName in fields
        ? fields[componentName]
        : () => {
            return (
                <UnsupportedField
                    schema={schema}
                    idSchema={idSchema}
                    reason={`Unknown field type ${schema.type}`}
                />
            );
        };
}


function Label(props) {
    const { label, required, id } = props;
    if (!label) {
        return null;
    }
    return (
        null
        // <label className="control-label" htmlFor={id}>
        //     {label}
        //     {required && <span className="required">{REQUIRED_FIELD_SYMBOL}</span>}
        // </label>
    );
}

function LabelInput(props) {
    const { id, label, onChange } = props;
    return (
        <input
            className="form-control"
            type="text"
            id={id}
            onBlur={event => onChange(event.target.value)}
            defaultValue={label}
        />
    );
}

function Help(props) {
    const { help } = props;
    if (!help) {
        return null;
    }
    if (typeof help === "string") {
        return <p className="help-block">{help}</p>;
    }
    return <div className="help-block">{help}</div>;
}

function ErrorList(props) {
    const { errors = [] } = props;
    if (errors.length === 0) {
        return null;
    }

    return (
        <div>
            <ul className="error-detail bs-callout bs-callout-info">
                {errors
                    .filter(elem => !!elem)
                    .map((error, index) => {
                        return (
                            <li className="text-danger" key={index}>
                                {error}
                            </li>
                        );
                    })}
            </ul>
        </div>
    );
}
function DefaultTemplate(props) {
    const {
        id,
        label,
        children,
        errors,
        help,
        description,
        hidden,
        required,
        displayLabel,
    } = props;
    if (hidden) {
        return <div className="hidden">{children}</div>;
    }

    return (
        <WrapIfAdditional {...props}>
            {displayLabel && <Label label={label} required={required} id={id} />}
            {displayLabel && description ? description : null}
            {children}
            {errors}
            {help}
        </WrapIfAdditional>
    );
}

DefaultTemplate.defaultProps = {
    hidden: false,
    readonly: false,
    required: false,
    displayLabel: true,
};

function WrapIfAdditional(props) {
    const {
        id,
        classNames,
        disabled,
        label,
        onKeyChange,
        onDropPropertyClick,
        readonly,
        required,
        schema,
    } = props;
    const keyLabel = `${label} Key`; // i18n ?
    const additional = schema.hasOwnProperty(ADDITIONAL_PROPERTY_FLAG);

    if (!additional) {
        return <div className={classNames}>{props.children}</div>;
    }

    return (
        <div className={classNames}>
            <div className="row">
                <div className="col-xs-5 form-additional">
                    <div className="form-group">
                        <Label label={keyLabel} required={required} id={`${id}-key`} />
                        <LabelInput
                            label={label}
                            required={required}
                            id={`${id}-key`}
                            onChange={onKeyChange}
                        />
                    </div>
                </div>
                <div className="form-additional form-group col-xs-5">
                    {props.children}
                </div>
                <div className="col-xs-2">
                    <IconButton
                        type="danger"
                        icon="remove"
                        className="array-item-remove btn-block"
                        tabIndex="-1"
                        style={{ border: "0" }}
                        disabled={disabled || readonly}
                        onClick={onDropPropertyClick(label)}
                    />
                </div>
            </div>
        </div>
    );
}

function SchemaFieldRender(props) {
    const {
        uiSchema,
        formData,
        errorSchema,
        idPrefix,
        name,
        onKeyChange,
        onDropPropertyClick,
        required,
        registry = getDefaultRegistry(),
        wasPropertyKeyModified = false,
    } = props;
    const { definitions, fields, formContext } = registry;
    const FieldTemplate =
        uiSchema["ui:FieldTemplate"] || registry.FieldTemplate || DefaultTemplate;
    let idSchema = props.idSchema;
    const schema = retrieveSchema(props.schema, definitions, formData);
    idSchema = mergeObjects(
        toIdSchema(schema, null, definitions, formData, idPrefix),
        idSchema
    );
    const FieldComponent = getFieldComponent(schema, uiSchema, idSchema, fields);
    const { DescriptionField } = fields;
    const disabled = Boolean(props.disabled || uiSchema["ui:disabled"]);
    const readonly = Boolean(
        props.readonly ||
        uiSchema["ui:readonly"] ||
        props.schema.readOnly ||
        schema.readOnly
    );
    const autofocus = Boolean(props.autofocus || uiSchema["ui:autofocus"]);
    if (Object.keys(schema).length === 0) {
        return null;
    }

    const uiOptions = getUiOptions(uiSchema);
    let { label: displayLabel = true } = uiOptions;
    if (schema.type === "array") {
        displayLabel =
            isMultiSelect(schema, definitions) ||
            isFilesArray(schema, uiSchema, definitions);
    }
    if (schema.type === "object") {
        displayLabel = false;
    }
    if (schema.type === "boolean" && !uiSchema["ui:widget"]) {
        displayLabel = false;
    }
    if (uiSchema["ui:field"]) {
        displayLabel = false;
    }

    const { __errors, ...fieldErrorSchema } = errorSchema;

    // See #439: uiSchema: Don't pass consumed class names to child components
    const field = (
        <FieldComponent
            {...props}
            idSchema={idSchema}
            schema={schema}
            uiSchema={{ ...uiSchema, classNames: undefined }}
            disabled={disabled}
            readonly={readonly}
            autofocus={autofocus}
            errorSchema={fieldErrorSchema}
            formContext={formContext}
            rawErrors={__errors}
        />
    );

    const { type } = schema;
    const id = idSchema.$id;

    // If this schema has a title defined, but the user has set a new key/label, retain their input.
    let label;
    if (wasPropertyKeyModified) {
        label = name;
    } else {
        label = uiSchema["ui:title"] || props.schema.title || schema.title || name;
    }

    const description =
        uiSchema["ui:description"] ||
        props.schema.description ||
        schema.description;
    const errors = __errors;
    const help = uiSchema["ui:help"];
    const hidden = uiSchema["ui:widget"] === "hidden";
    const classNames = [
        "form-group",
        "field",
        `field-${type}`,
        errors && errors.length > 0 ? "field-error has-error has-danger" : "",
        uiSchema.classNames,
    ]
        .join(" ")
        .trim();

    const fieldProps = {
        description: (
            <DescriptionField
                id={id + "__description"}
                description={description}
                formContext={formContext}
            />
        ),
        rawDescription: description,
        help: <Help help={help} />,
        rawHelp: typeof help === "string" ? help : undefined,
        errors: <ErrorList errors={errors} />,
        rawErrors: errors,
        id,
        label,
        hidden,
        onKeyChange,
        onDropPropertyClick,
        required,
        disabled,
        readonly,
        displayLabel,
        classNames,
        formContext,
        fields,
        schema,
        uiSchema,
    };

    const _AnyOfField = registry.fields.AnyOfField;
    const _OneOfField = registry.fields.OneOfField;

    return (
        <FieldTemplate {...fieldProps}>
            {field}

            {/*
        If the schema `anyOf` or 'oneOf' can be rendered as a select control, don't
        render the selection and let `StringField` component handle
        rendering
      */}
            {schema.anyOf && !isSelect(schema) && (
                <_AnyOfField
                    disabled={disabled}
                    errorSchema={errorSchema}
                    formData={formData}
                    idPrefix={idPrefix}
                    idSchema={idSchema}
                    onBlur={props.onBlur}
                    onChange={props.onChange}
                    onFocus={props.onFocus}
                    options={schema.anyOf}
                    baseType={schema.type}
                    registry={registry}
                    schema={schema}
                    uiSchema={uiSchema}
                />
            )}

            {schema.oneOf && !isSelect(schema) && (
                <_OneOfField
                    disabled={disabled}
                    errorSchema={errorSchema}
                    formData={formData}
                    idPrefix={idPrefix}
                    idSchema={idSchema}
                    onBlur={props.onBlur}
                    onChange={props.onChange}
                    onFocus={props.onFocus}
                    options={schema.oneOf}
                    baseType={schema.type}
                    registry={registry}
                    schema={schema}
                    uiSchema={uiSchema}
                />
            )}
        </FieldTemplate>
    );
}

class SchemaField extends React.Component {
    shouldComponentUpdate(nextProps, nextState) {
        return !deepEquals(this.props, nextProps);
    }

    render() {
        return SchemaFieldRender(this.props);
    }
}

SchemaField.defaultProps = {
    uiSchema: {},
    errorSchema: {},
    idSchema: {},
    disabled: false,
    readonly: false,
    autofocus: false,
};


function StringField(props) {
    const {
        schema,
        name,
        uiSchema,
        idSchema,
        formData,
        required,
        disabled,
        readonly,
        autofocus,
        onChange,
        onBlur,
        onFocus,
        registry = getDefaultRegistry(),
        rawErrors,
    } = props;
    const { title, format } = schema;
    const { widgets, formContext } = registry;
    const enumOptions = isSelect(schema) && optionsList(schema);
    let defaultWidget = enumOptions ? "select" : "text";
    if (format && hasWidget(schema, format, widgets)) {
        defaultWidget = format;
    }
    const { widget = defaultWidget, placeholder = "", ...options } = getUiOptions(
        uiSchema
    );
    const Widget = getWidget(schema, widget, widgets);
    return (
        <Widget
            options={{ ...options, enumOptions }}
            schema={schema}
            id={idSchema && idSchema.$id}
            label={title === undefined ? name : title}
            value={formData}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={onFocus}
            required={required}
            disabled={disabled}
            readonly={readonly}
            formContext={formContext}
            autofocus={autofocus}
            registry={registry}
            placeholder={placeholder}
            rawErrors={rawErrors}
        />
    );
}

StringField.defaultProps = {
    uiSchema: {},
    disabled: false,
    readonly: false,
    autofocus: false,
};

function TitleField(props) {
    const { id, title, required } = props;
    return (
        <legend id={id}>
            {title}
            {required && <span className="required">{REQUIRED_FIELD_SYMBOL}</span>}
        </legend>
    );
}

function UnsupportedField({ schema, idSchema, reason }) {
    return (
        <div className="unsupported-field">
            <p>
                Unsupported field schema
          {idSchema && idSchema.$id && (
                    <span>
                        {" for"} field <code>{idSchema.$id}</code>
                    </span>
                )}
                {reason && <em>: {reason}</em>}.
        </p>
            {schema && <pre>{JSON.stringify(schema, null, 2)}</pre>}
        </div>
    );
}


function BaseInput(props) {
    // Note: since React 15.2.0 we can't forward unknown element attributes, so we
    // exclude the "options" and "schema" ones here.
    if (!props.id) {
        console.log("No id for", props);
        throw new Error(`no id for props ${JSON.stringify(props)}`);
    }
    const {
        value,
        readonly,
        disabled,
        autofocus,
        onBlur,
        onFocus,
        options,
        schema,
        formContext,
        registry,
        rawErrors,
        ...inputProps
    } = props;

    // If options.inputType is set use that as the input type
    if (options.inputType) {
        inputProps.type = options.inputType;
    } else if (!inputProps.type) {
        // If the schema is of type number or integer, set the input type to number
        if (schema.type === "number") {
            inputProps.type = "number";
            // Setting step to 'any' fixes a bug in Safari where decimals are not
            // allowed in number inputs
            inputProps.step = "any";
        } else if (schema.type === "integer") {
            inputProps.type = "number";
            // Since this is integer, you always want to step up or down in multiples
            // of 1
            inputProps.step = "1";
        } else {
            inputProps.type = "text";
        }
    }

    // If multipleOf is defined, use this as the step value. This mainly improves
    // the experience for keyboard users (who can use the up/down KB arrows).
    if (schema.multipleOf) {
        inputProps.step = schema.multipleOf;
    }

    if (typeof schema.minimum !== "undefined") {
        inputProps.min = schema.minimum;
    }

    if (typeof schema.maximum !== "undefined") {
        inputProps.max = schema.maximum;
    }

    const _onChange = ({ target: { value } }) => {
        return props.onChange(value === "" ? options.emptyValue : value);
    };

    return [
        <input
            key={inputProps.id}
            className="form-control"
            readOnly={readonly}
            disabled={disabled}
            autoFocus={autofocus}
            value={value == null ? "" : value}
            {...inputProps}
            list={schema.examples ? `examples_${inputProps.id}` : null}
            onChange={_onChange}
            onBlur={onBlur && (event => onBlur(inputProps.id, event.target.value))}
            onFocus={onFocus && (event => onFocus(inputProps.id, event.target.value))}
        />,
        schema.examples ? (
            <datalist id={`examples_${inputProps.id}`}>
                {[
                    ...new Set(
                        schema.examples.concat(schema.default ? [schema.default] : [])
                    ),
                ].map(example => (
                    <option key={example} value={example} />
                ))}
            </datalist>
        ) : null,
    ];
}

BaseInput.defaultProps = {
    required: false,
    disabled: false,
    readonly: false,
    autofocus: false,
};

function PasswordWidget(props) {
    const { BaseInput } = props.registry.widgets;
    return <BaseInput type="password" {...props} />;
}


function RadioWidget(props) {
    const {
        options,
        value,
        required,
        disabled,
        readonly,
        autofocus,
        onChange,
        onBlur,
        onFocus,
        label,
        id,
    } = props;
    // Generating a unique field name to identify this set of radio buttons
    const name = Math.random().toString();
    const { enumOptions, enumDisabled, inline } = options;
    // checked={checked} has been moved above name={name}, As mentioned in #349;
    // this is a temporary fix for radio button rendering bug in React, facebook/react#7630.
    for (var i = 0; i < enumOptions.length; i++) {
        enumOptions[i]["text"] = enumOptions[i]["label"];
        enumOptions[i]["key"] = enumOptions[i]["value"];
    }
    return (
        <ChoiceGroup id={id}
            defaultSelectedKey={value}
            label={label}
            options={enumOptions}
            onChange={onChange && ((event, option) => onChange(option.key))}
            onBlur={onBlur && (event => onBlur(id, event.target.value))}
            onFocus={onFocus && (event => onFocus(id, event.target.value))}
            autoFocus={autofocus && i === 0}
            required={required}
        />
        // <div className="field-radio-group" id={id}>
        //     {enumOptions.map((option, i) => {
        //         console.log(option)
        //         const checked = option.value === value;
        //         const itemDisabled =
        //             enumDisabled && enumDisabled.indexOf(option.value) != -1;
        //         const disabledCls =
        //             disabled || itemDisabled || readonly ? "disabled" : "";
        //         const radio = (
        //             <span>
        //                 <input
        //                     type="radio"
        //                     checked={checked}
        //                     name={name}
        //                     required={required}
        //                     value={option.value}
        //                     disabled={disabled || itemDisabled || readonly}
        //                     autoFocus={autofocus && i === 0}
        //                     onChange={_ => onChange(option.value)}
        //                     onBlur={onBlur && (event => onBlur(id, event.target.value))}
        //                     onFocus={onFocus && (event => onFocus(id, event.target.value))}
        //                 />
        //                 <span>{option.label}</span>
        //             </span>
        //         );
        //         return inline ? (
        //             <label key={i} className={`radio-inline ${disabledCls}`}>
        //                 {radio}
        //             </label>
        //         ) : (
        //                 <div key={i} className={`radio ${disabledCls}`}>
        //                     <label>{radio}</label>
        //                 </div>
        //             );
        //     })}
        // </div>
    );
}

RadioWidget.defaultProps = {
    autofocus: false,
};


function UpDownWidget(props) {
    const {
        registry: {
            widgets: { BaseInput },
        },
    } = props;
    return <BaseInput type="number" {...props} {...rangeSpec(props.schema)} />;
}

function RangeWidget(props) {
    const {
        schema,
        value,
        registry: {
            widgets: { BaseInput },
        },
    } = props;
    return (
        <div className="field-range-wrapper">
            <BaseInput type="range" {...props} {...rangeSpec(schema)} />
            <span className="range-view">{value}</span>
        </div>
    );
}


const nums = new Set(["number", "integer"]);

/**
 * This is a silly limitation in the DOM where option change event values are
 * always retrieved as strings.
 */
function processValue(schema, value) {
    // "enum" is a reserved word, so only "type" and "items" can be destructured
    const { type, items } = schema;
    if (value === "") {
        return undefined;
    } else if (type === "array" && items && nums.has(items.type)) {
        return value.map(asNumber);
    } else if (type === "boolean") {
        return value === "true";
    } else if (type === "number") {
        return asNumber(value);
    }

    // If type is undefined, but an enum is present, try and infer the type from
    // the enum values
    if (schema.enum) {
        if (schema.enum.every(x => guessType(x) === "number")) {
            return asNumber(value);
        } else if (schema.enum.every(x => guessType(x) === "boolean")) {
            return value === "true";
        }
    }

    return value;
}

function getValue(event, multiple) {
    if (multiple) {
        return [].slice
            .call(event.target.options)
            .filter(o => o.selected)
            .map(o => o.value);
    } else {
        return event.target.value;
    }
}

function SelectWidget(props) {
    const {
        schema,
        id,
        options,
        value,
        required,
        disabled,
        readonly,
        multiple,
        autofocus,
        onChange,
        onBlur,
        onFocus,
        placeholder,
    } = props;
    const { enumOptions, enumDisabled } = options;
    const emptyValue = multiple ? [] : "";
    return (
        <select
            id={id}
            multiple={multiple}
            className="form-control"
            value={typeof value === "undefined" ? emptyValue : value}
            required={required}
            disabled={disabled || readonly}
            autoFocus={autofocus}
            onBlur={
                onBlur &&
                (event => {
                    const newValue = getValue(event, multiple);
                    onBlur(id, processValue(schema, newValue));
                })
            }
            onFocus={
                onFocus &&
                (event => {
                    const newValue = getValue(event, multiple);
                    onFocus(id, processValue(schema, newValue));
                })
            }
            onChange={event => {
                const newValue = getValue(event, multiple);
                onChange(processValue(schema, newValue));
            }}>
            {!multiple && schema.default === undefined && (
                <option value="">{placeholder}</option>
            )}
            {enumOptions.map(({ value, label }, i) => {
                const disabled = enumDisabled && enumDisabled.indexOf(value) != -1;
                return (
                    <option key={i} value={value} disabled={disabled}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
}

SelectWidget.defaultProps = {
    autofocus: false,
};

function TextWidget(props) {
    const { BaseInput } = props.registry.widgets;
    return <TextField {...props} />
    // return <BaseInput {...props} />;
}

function DateWidget(props) {
    const {
        onChange,
        registry: {
            widgets: { BaseInput },
        },
    } = props;
    return (
        <BaseInput
            type="date"
            {...props}
            onChange={value => onChange(value || undefined)}
        />
    );
}

function utcToLocal(jsonDate) {
    if (!jsonDate) {
        return "";
    }

    // required format of `"yyyy-MM-ddThh:mm" followed by optional ":ss" or ":ss.SSS"
    // https://html.spec.whatwg.org/multipage/input.html#local-date-and-time-state-(type%3Ddatetime-local)
    // > should be a _valid local date and time string_ (not GMT)

    // Note - date constructor passed local ISO-8601 does not correctly
    // change time to UTC in node pre-8
    const date = new Date(jsonDate);

    const yyyy = pad(date.getFullYear(), 4);
    const MM = pad(date.getMonth() + 1, 2);
    const dd = pad(date.getDate(), 2);
    const hh = pad(date.getHours(), 2);
    const mm = pad(date.getMinutes(), 2);
    const ss = pad(date.getSeconds(), 2);
    const SSS = pad(date.getMilliseconds(), 3);

    return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${SSS}`;
}

function localToUTC(dateString) {
    if (dateString) {
        return new Date(dateString).toJSON();
    }
}

function DateTimeWidget(props) {
    const {
        value,
        onChange,
        registry: {
            widgets: { BaseInput },
        },
    } = props;
    return (
        <BaseInput
            type="datetime-local"
            {...props}
            value={utcToLocal(value)}
            onChange={value => onChange(localToUTC(value))}
        />
    );
}





function rangeOptions(start, stop) {
    let options = [];
    for (let i = start; i <= stop; i++) {
        options.push({ value: i, label: pad(i, 2) });
    }
    return options;
}

function readyForChange(state) {
    return Object.keys(state).every(key => state[key] !== -1);
}

function DateElement(props) {
    const {
        type,
        range,
        value,
        select,
        rootId,
        disabled,
        readonly,
        autofocus,
        registry,
        onBlur,
    } = props;
    const id = rootId + "_" + type;
    const { SelectWidget } = registry.widgets;
    return (
        <SelectWidget
            schema={{ type: "integer" }}
            id={id}
            className="form-control"
            options={{ enumOptions: rangeOptions(range[0], range[1]) }}
            placeholder={type}
            value={value}
            disabled={disabled}
            readonly={readonly}
            autofocus={autofocus}
            onChange={value => select(type, value)}
            onBlur={onBlur}
        />
    );
}

class AltDateWidget extends React.Component {
    static defaultProps = {
        time: false,
        disabled: false,
        readonly: false,
        autofocus: false,
        options: {
            yearsRange: [1900, new Date().getFullYear() + 2],
        },
    };

    constructor(props) {
        super(props);
        this.state = parseDateString(props.value, props.time);
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState(parseDateString(nextProps.value, nextProps.time));
    }

    shouldComponentUpdate(nextProps, nextState) {
        return shouldRender(this, nextProps, nextState);
    }

    onChange = (property, value) => {
        this.setState(
            { [property]: typeof value === "undefined" ? -1 : value },
            () => {
                // Only propagate to parent state if we have a complete date{time}
                if (readyForChange(this.state)) {
                    this.props.onChange(toDateString(this.state, this.props.time));
                }
            }
        );
    };

    setNow = event => {
        event.preventDefault();
        const { time, disabled, readonly, onChange } = this.props;
        if (disabled || readonly) {
            return;
        }
        const nowDateObj = parseDateString(new Date().toJSON(), time);
        this.setState(nowDateObj, () => onChange(toDateString(this.state, time)));
    };

    clear = event => {
        event.preventDefault();
        const { time, disabled, readonly, onChange } = this.props;
        if (disabled || readonly) {
            return;
        }
        this.setState(parseDateString("", time), () => onChange(undefined));
    };

    get dateElementProps() {
        const { time, options } = this.props;
        const { year, month, day, hour, minute, second } = this.state;
        const data = [
            {
                type: "year",
                range: options.yearsRange,
                value: year,
            },
            { type: "month", range: [1, 12], value: month },
            { type: "day", range: [1, 31], value: day },
        ];
        if (time) {
            data.push(
                { type: "hour", range: [0, 23], value: hour },
                { type: "minute", range: [0, 59], value: minute },
                { type: "second", range: [0, 59], value: second }
            );
        }
        return data;
    }

    render() {
        const {
            id,
            disabled,
            readonly,
            autofocus,
            registry,
            onBlur,
            options,
        } = this.props;
        return (
            <ul className="list-inline">
                {this.dateElementProps.map((elemProps, i) => (
                    <li key={i}>
                        <DateElement
                            rootId={id}
                            select={this.onChange}
                            {...elemProps}
                            disabled={disabled}
                            readonly={readonly}
                            registry={registry}
                            onBlur={onBlur}
                            autofocus={autofocus && i === 0}
                        />
                    </li>
                ))}
                {(options.hideNowButton !== "undefined"
                    ? !options.hideNowButton
                    : true) && (
                        <li>
                            <a href="#" className="btn btn-info btn-now" onClick={this.setNow}>
                                Now
              </a>
                        </li>
                    )}
                {(options.hideClearButton !== "undefined"
                    ? !options.hideClearButton
                    : true) && (
                        <li>
                            <a
                                href="#"
                                className="btn btn-warning btn-clear"
                                onClick={this.clear}>
                                Clear
              </a>
                        </li>
                    )}
            </ul>
        );
    }
}


function AltDateTimeWidget(props) {
    const { AltDateWidget } = props.registry.widgets;
    return <AltDateWidget time {...props} />;
}

AltDateTimeWidget.defaultProps = {
    ...AltDateWidget.defaultProps,
    time: true,
};

function EmailWidget(props) {
    const { BaseInput } = props.registry.widgets;
    return <BaseInput type="email" {...props} />;
}

function URLWidget(props) {
    const { BaseInput } = props.registry.widgets;
    return <BaseInput type="url" {...props} />;
}


function TextareaWidget(props) {
    const {
        id,
        options,
        placeholder,
        value,
        required,
        disabled,
        readonly,
        autofocus,
        onChange,
        onBlur,
        onFocus,
    } = props;
    const _onChange = ({ target: { value } }) => {
        return onChange(value === "" ? options.emptyValue : value);
    };
    return (
        <textarea
            id={id}
            className="form-control"
            value={typeof value === "undefined" ? "" : value}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            readOnly={readonly}
            autoFocus={autofocus}
            rows={options.rows}
            onBlur={onBlur && (event => onBlur(id, event.target.value))}
            onFocus={onFocus && (event => onFocus(id, event.target.value))}
            onChange={_onChange}
        />
    );
}

TextareaWidget.defaultProps = {
    autofocus: false,
    options: {},
};

function HiddenWidget({ id, value }) {
    return (
        <input
            type="hidden"
            id={id}
            value={typeof value === "undefined" ? "" : value}
        />
    );
}


function ColorWidget(props) {
    const {
        disabled,
        readonly,
        registry: {
            widgets: { BaseInput },
        },
    } = props;
    return <BaseInput type="color" {...props} disabled={disabled || readonly} />;
}


function addNameToDataURL(dataURL, name) {
    return dataURL.replace(";base64", `;name=${encodeURIComponent(name)};base64`);
}

function processFile(file) {
    const { name, size, type } = file;
    return new Promise((resolve, reject) => {
        const reader = new window.FileReader();
        reader.onerror = reject;
        reader.onload = event => {
            resolve({
                dataURL: addNameToDataURL(event.target.result, name),
                name,
                size,
                type,
            });
        };
        reader.readAsDataURL(file);
    });
}

function processFiles(files) {
    return Promise.all([].map.call(files, processFile));
}

function FilesInfo(props) {
    const { filesInfo } = props;
    if (filesInfo.length === 0) {
        return null;
    }
    return (
        <ul className="file-info">
            {filesInfo.map((fileInfo, key) => {
                const { name, size, type } = fileInfo;
                return (
                    <li key={key}>
                        <strong>{name}</strong> ({type}, {size} bytes)
            </li>
                );
            })}
        </ul>
    );
}

function extractFileInfo(dataURLs) {
    return dataURLs
        .filter(dataURL => typeof dataURL !== "undefined")
        .map(dataURL => {
            const { blob, name } = dataURItoBlob(dataURL);
            return {
                name: name,
                size: blob.size,
                type: blob.type,
            };
        });
}

class FileWidget extends React.Component {
    constructor(props) {
        super(props);
        const { value } = props;
        const values = Array.isArray(value) ? value : [value];
        this.state = { values, filesInfo: extractFileInfo(values) };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return shouldRender(this, nextProps, nextState);
    }

    onChange = event => {
        const { multiple, onChange } = this.props;
        processFiles(event.target.files).then(filesInfo => {
            const state = {
                values: filesInfo.map(fileInfo => fileInfo.dataURL),
                filesInfo,
            };
            this.setState(state, () => {
                if (multiple) {
                    onChange(state.values);
                } else {
                    onChange(state.values[0]);
                }
            });
        });
    };

    render() {
        const { multiple, id, readonly, disabled, autofocus, options } = this.props;
        const { filesInfo } = this.state;
        return (
            <div>
                <p>
                    <input
                        ref={ref => (this.inputRef = ref)}
                        id={id}
                        type="file"
                        disabled={readonly || disabled}
                        onChange={this.onChange}
                        defaultValue=""
                        autoFocus={autofocus}
                        multiple={multiple}
                        accept={options.accept}
                    />
                </p>
                <FilesInfo filesInfo={filesInfo} />
            </div>
        );
    }
}

FileWidget.defaultProps = {
    autofocus: false,
};

function selectValue(value, selected, all) {
    const at = all.indexOf(value);
    const updated = selected.slice(0, at).concat(value, selected.slice(at));
    // As inserting values at predefined index positions doesn't work with empty
    // arrays, we need to reorder the updated selection to match the initial order
    return updated.sort((a, b) => all.indexOf(a) > all.indexOf(b));
}

function deselectValue(value, selected) {
    return selected.filter(v => v !== value);
}

function CheckboxesWidget(props) {
    const { id, disabled, options, value, autofocus, readonly, onChange } = props;
    const { enumOptions, enumDisabled, inline } = options;
    return (
        <div className="checkboxes" id={id}>
            {enumOptions.map((option, index) => {
                const checked = value.indexOf(option.value) !== -1;
                const itemDisabled =
                    enumDisabled && enumDisabled.indexOf(option.value) != -1;
                const disabledCls =
                    disabled || itemDisabled || readonly ? "disabled" : "";
                const checkbox = (
                    <span>
                        <input
                            type="checkbox"
                            id={`${id}_${index}`}
                            checked={checked}
                            disabled={disabled || itemDisabled || readonly}
                            autoFocus={autofocus && index === 0}
                            onChange={event => {
                                const all = enumOptions.map(({ value }) => value);
                                if (event.target.checked) {
                                    onChange(selectValue(option.value, value, all));
                                } else {
                                    onChange(deselectValue(option.value, value));
                                }
                            }}
                        />
                        <span>{option.label}</span>
                    </span>
                );
                return inline ? (
                    <label key={index} className={`checkbox-inline ${disabledCls}`}>
                        {checkbox}
                    </label>
                ) : (
                        <div key={index} className={`checkbox ${disabledCls}`}>
                            <label>{checkbox}</label>
                        </div>
                    );
            })}
        </div>
    );
}

CheckboxesWidget.defaultProps = {
    autofocus: false,
    options: {
        inline: false,
    },
};


// Check to see if a schema specifies that a value must be true
function schemaRequiresTrueValue(schema) {
    // Check if const is a truthy value
    if (schema.const) {
        return true;
    }

    // Check if an enum has a single value of true
    if (schema.enum && schema.enum.length === 1 && schema.enum[0] === true) {
        return true;
    }

    // If anyOf has a single value, evaluate the subschema
    if (schema.anyOf && schema.anyOf.length === 1) {
        return schemaRequiresTrueValue(schema.anyOf[0]);
    }

    // If oneOf has a single value, evaluate the subschema
    if (schema.oneOf && schema.oneOf.length === 1) {
        return schemaRequiresTrueValue(schema.oneOf[0]);
    }

    // Evaluate each subschema in allOf, to see if one of them requires a true
    // value
    if (schema.allOf) {
        return schema.allOf.some(schemaRequiresTrueValue);
    }
}

function CheckboxWidget(props) {
    const {
        schema,
        id,
        value,
        disabled,
        readonly,
        label,
        autofocus,
        onBlur,
        onFocus,
        onChange,
    } = props;

    // Because an unchecked checkbox will cause html5 validation to fail, only add
    // the "required" attribute if the field value must be "true", due to the
    // "const" or "enum" keywords
    const required = schemaRequiresTrueValue(schema);

    return (
        <div className={`checkbox ${disabled || readonly ? "disabled" : ""}`}>
            {schema.description && (
                <DescriptionField description={schema.description} />
            )}
            {/* <label>
                <input
                    type="checkbox"
                    id={id}
                    checked={typeof value === "undefined" ? false : value}
                    required={required}
                    disabled={disabled || readonly}
                    autoFocus={autofocus}
                    onChange={event => onChange(event.target.checked)}
                    onBlur={onBlur && (event => onBlur(id, event.target.checked))}
                    onFocus={onFocus && (event => onFocus(id, event.target.checked))}
                />
                <span>{label}</span>
            </label> */}
            <Checkbox label={label}
                id={id}
                defaultChecked={typeof value === "undefined" ? false : value}
                required={required}
                disabled={disabled || readonly}
                autoFocus={autofocus}
                onChange={event => onChange(event.target.checked)}
                onBlur={onBlur && (event => onBlur(id, event.target.checked))}
                onFocus={onFocus && (event => onFocus(id, event.target.checked))}
                onText="On" offText="Off" />
        </div>
    );
}

CheckboxWidget.defaultProps = {
    autofocus: false,
};

let ajv = createAjvInstance();
let formerCustomFormats = null;
let formerMetaSchema = null;

function createAjvInstance() {
    const ajv = new Ajv({
        errorDataPath: "property",
        allErrors: true,
        multipleOfPrecision: 8,
        schemaId: "auto",
        unknownFormats: "ignore",
    });

    // add custom formats
    ajv.addFormat(
        "data-url",
        /^data:([a-z]+\/[a-z0-9-+.]+)?;(?:name=(.*);)?base64,(.*)$/
    );
    ajv.addFormat(
        "color",
        /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/
    );
    return ajv;
}

function toErrorSchema(errors) {
    // Transforms a ajv validation errors list:
    // [
    //   {property: ".level1.level2[2].level3", message: "err a"},
    //   {property: ".level1.level2[2].level3", message: "err b"},
    //   {property: ".level1.level2[4].level3", message: "err b"},
    // ]
    // Into an error tree:
    // {
    //   level1: {
    //     level2: {
    //       2: {level3: {errors: ["err a", "err b"]}},
    //       4: {level3: {errors: ["err b"]}},
    //     }
    //   }
    // };
    if (!errors.length) {
        return {};
    }
    return errors.reduce((errorSchema, error) => {
        const { property, message } = error;
        const path = toPath(property);
        let parent = errorSchema;

        // If the property is at the root (.level1) then toPath creates
        // an empty array element at the first index. Remove it.
        if (path.length > 0 && path[0] === "") {
            path.splice(0, 1);
        }

        for (const segment of path.slice(0)) {
            if (!(segment in parent)) {
                parent[segment] = {};
            }
            parent = parent[segment];
        }

        if (Array.isArray(parent.__errors)) {
            // We store the list of errors for this node in a property named __errors
            // to avoid name collision with a possible sub schema field named
            // "errors" (see `validate.createErrorHandler`).
            parent.__errors = parent.__errors.concat(message);
        } else {
            if (message) {
                parent.__errors = [message];
            }
        }
        return errorSchema;
    }, {});
}

function toErrorList(errorSchema, fieldName = "root") {
    // XXX: We should transform fieldName as a full field path string.
    let errorList = [];
    if ("__errors" in errorSchema) {
        errorList = errorList.concat(
            errorSchema.__errors.map(stack => {
                return {
                    stack: `${fieldName}: ${stack}`,
                };
            })
        );
    }
    return Object.keys(errorSchema).reduce((acc, key) => {
        if (key !== "__errors") {
            acc = acc.concat(toErrorList(errorSchema[key], key));
        }
        return acc;
    }, errorList);
}

function createErrorHandler(formData) {
    const handler = {
        // We store the list of errors for this node in a property named __errors
        // to avoid name collision with a possible sub schema field named
        // "errors" (see `utils.toErrorSchema`).
        __errors: [],
        addError(message) {
            this.__errors.push(message);
        },
    };
    if (isObject(formData)) {
        return Object.keys(formData).reduce((acc, key) => {
            return { ...acc, [key]: createErrorHandler(formData[key]) };
        }, handler);
    }
    if (Array.isArray(formData)) {
        return formData.reduce((acc, value, key) => {
            return { ...acc, [key]: createErrorHandler(value) };
        }, handler);
    }
    return handler;
}

function unwrapErrorHandler(errorHandler) {
    return Object.keys(errorHandler).reduce((acc, key) => {
        if (key === "addError") {
            return acc;
        } else if (key === "__errors") {
            return { ...acc, [key]: errorHandler[key] };
        }
        return { ...acc, [key]: unwrapErrorHandler(errorHandler[key]) };
    }, {});
}

/**
 * Transforming the error output from ajv to format used by jsonschema.
 * At some point, components should be updated to support ajv.
 */
function transformAjvErrors(errors = []) {
    if (errors === null) {
        return [];
    }

    return errors.map(e => {
        const { dataPath, keyword, message, params, schemaPath } = e;
        let property = `${dataPath}`;

        // put data in expected format
        return {
            name: keyword,
            property,
            message,
            params, // specific to ajv
            stack: `${property} ${message}`.trim(),
            schemaPath,
        };
    });
}

/**
 * This function processes the formData with a user `validate` contributed
 * function, which receives the form data and an `errorHandler` object that
 * will be used to add custom validation errors for each field.
 */
function validateFormData(
    formData,
    schema,
    customValidate,
    transformErrors,
    additionalMetaSchemas = [],
    customFormats = {}
) {
    // Include form data with undefined values, which is required for validation.
    const { definitions } = schema;
    formData = getDefaultFormState(schema, formData, definitions, true);

    const newMetaSchemas = !deepEquals(formerMetaSchema, additionalMetaSchemas);
    const newFormats = !deepEquals(formerCustomFormats, customFormats);

    if (newMetaSchemas || newFormats) {
        ajv = createAjvInstance();
    }

    // add more schemas to validate against
    if (
        additionalMetaSchemas &&
        newMetaSchemas &&
        Array.isArray(additionalMetaSchemas)
    ) {
        ajv.addMetaSchema(additionalMetaSchemas);
        formerMetaSchema = additionalMetaSchemas;
    }

    // add more custom formats to validate against
    if (customFormats && newFormats && isObject(customFormats)) {
        Object.keys(customFormats).forEach(formatName => {
            ajv.addFormat(formatName, customFormats[formatName]);
        });

        formerCustomFormats = customFormats;
    }

    let validationError = null;
    try {
        ajv.validate(schema, formData);
    } catch (err) {
        validationError = err;
    }

    let errors = transformAjvErrors(ajv.errors);
    // Clear errors to prevent persistent errors, see #1104

    ajv.errors = null;

    const noProperMetaSchema =
        validationError &&
        validationError.message &&
        typeof validationError.message === "string" &&
        validationError.message.includes("no schema with key or ref ");

    if (noProperMetaSchema) {
        errors = [
            ...errors,
            {
                stack: validationError.message,
            },
        ];
    }
    if (typeof transformErrors === "function") {
        errors = transformErrors(errors);
    }

    let errorSchema = toErrorSchema(errors);

    if (noProperMetaSchema) {
        errorSchema = {
            ...errorSchema,
            ...{
                $schema: {
                    __errors: [validationError.message],
                },
            },
        };
    }

    if (typeof customValidate !== "function") {
        return { errors, errorSchema };
    }

    const errorHandler = customValidate(formData, createErrorHandler(formData));
    const userErrorSchema = unwrapErrorHandler(errorHandler);
    const newErrorSchema = mergeObjects(errorSchema, userErrorSchema, true);
    // XXX: The errors list produced is not fully compliant with the format
    // exposed by the jsonschema lib, which contains full field paths and other
    // properties.
    const newErrors = toErrorList(newErrorSchema);

    return {
        errors: newErrors,
        errorSchema: newErrorSchema,
    };
}

/**
 * Validates data against a schema, returning true if the data is valid, or
 * false otherwise. If the schema is invalid, then this function will return
 * false.
 */
function isValid(schema, data) {
    try {
        return ajv.validate(schema, data);
    } catch (e) {
        return false;
    }
}



class JsonSchemaForm extends React.Component {
    static defaultProps = {
        uiSchema: {},
        noValidate: false,
        liveValidate: false,
        disabled: false,
        noHtml5Validate: false,
        ErrorList: DefaultErrorList,
        omitExtraData: false,
    };

    constructor(props) {
        super(props);
        this.state = this.getStateFromProps(props, props.formData);
        if (
            this.props.onChange &&
            !deepEquals(this.state.formData, this.props.formData)
        ) {
            this.props.onChange(this.state);
        }
        this.formElement = null;
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        const nextState = this.getStateFromProps(nextProps, nextProps.formData);
        if (
            !deepEquals(nextState.formData, nextProps.formData) &&
            !deepEquals(nextState.formData, this.state.formData) &&
            this.props.onChange
        ) {
            this.props.onChange(nextState);
        }
        this.setState(nextState);
    }

    getStateFromProps(props, inputFormData) {
        const state = this.state || {};
        const schema = "schema" in props ? props.schema : this.props.schema;
        const uiSchema = "uiSchema" in props ? props.uiSchema : this.props.uiSchema;
        const edit = typeof inputFormData !== "undefined";
        const liveValidate = props.liveValidate || this.props.liveValidate;
        const mustValidate = edit && !props.noValidate && liveValidate;
        const { definitions } = schema;
        const formData = getDefaultFormState(schema, inputFormData, definitions);
        const retrievedSchema = retrieveSchema(schema, definitions, formData);
        const customFormats = props.customFormats;
        const additionalMetaSchemas = props.additionalMetaSchemas;
        let { errors, errorSchema } = mustValidate
            ? this.validate(formData, schema, additionalMetaSchemas, customFormats)
            : {
                errors: state.errors || [],
                errorSchema: state.errorSchema || {},
            };
        if (props.extraErrors) {
            errorSchema = mergeObjects(errorSchema, props.extraErrors);
            errors = toErrorList(errorSchema);
        }
        const idSchema = toIdSchema(
            retrievedSchema,
            uiSchema["ui:rootFieldId"],
            definitions,
            formData,
            props.idPrefix
        );
        return {
            schema,
            uiSchema,
            idSchema,
            formData,
            edit,
            errors,
            errorSchema,
            additionalMetaSchemas,
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return shouldRender(this, nextProps, nextState);
    }

    validate(
        formData,
        schema = this.props.schema,
        additionalMetaSchemas = this.props.additionalMetaSchemas,
        customFormats = this.props.customFormats
    ) {
        const { validate, transformErrors } = this.props;
        const { definitions } = this.getRegistry();
        const resolvedSchema = retrieveSchema(schema, definitions, formData);
        return validateFormData(
            formData,
            resolvedSchema,
            validate,
            transformErrors,
            additionalMetaSchemas,
            customFormats
        );
    }

    renderErrors() {
        const { errors, errorSchema, schema, uiSchema } = this.state;
        const { ErrorList, showErrorList, formContext } = this.props;

        if (errors.length && showErrorList != false) {
            return (
                <ErrorList
                    errors={errors}
                    errorSchema={errorSchema}
                    schema={schema}
                    uiSchema={uiSchema}
                    formContext={formContext}
                />
            );
        }
        return null;
    }

    getUsedFormData = (formData, fields) => {
        //for the case of a single input form
        if (fields.length === 0 && typeof formData !== "object") {
            return formData;
        }

        let data = _pick(formData, fields);
        if (Array.isArray(formData)) {
            return Object.keys(data).map(key => data[key]);
        }

        return data;
    };

    getFieldNames = (pathSchema, formData) => {
        const getAllPaths = (_obj, acc = [], paths = [""]) => {
            Object.keys(_obj).forEach(key => {
                if (typeof _obj[key] === "object") {
                    let newPaths = paths.map(path => `${path}.${key}`);
                    getAllPaths(_obj[key], acc, newPaths);
                } else if (key === "$name" && _obj[key] !== "") {
                    paths.forEach(path => {
                        path = path.replace(/^\./, "");
                        const formValue = _get(formData, path);
                        // adds path to fieldNames if it points to a value
                        // or an empty object/array
                        if (typeof formValue !== "object" || _isEmpty(formValue)) {
                            acc.push(path);
                        }
                    });
                }
            });
            return acc;
        };

        return getAllPaths(pathSchema);
    };

    onChange = (formData, newErrorSchema) => {
        if (isObject(formData) || Array.isArray(formData)) {
            const newState = this.getStateFromProps(this.props, formData);
            formData = newState.formData;
        }
        const mustValidate = !this.props.noValidate && this.props.liveValidate;
        let state = { formData };
        let newFormData = formData;

        if (this.props.omitExtraData === true && this.props.liveOmit === true) {
            const retrievedSchema = retrieveSchema(
                this.state.schema,
                this.state.schema.definitions,
                formData
            );
            const pathSchema = toPathSchema(
                retrievedSchema,
                "",
                this.state.schema.definitions,
                formData
            );

            const fieldNames = this.getFieldNames(pathSchema, formData);

            newFormData = this.getUsedFormData(formData, fieldNames);
            state = {
                formData: newFormData,
            };
        }

        if (mustValidate) {
            let { errors, errorSchema } = this.validate(newFormData);
            if (this.props.extraErrors) {
                errorSchema = mergeObjects(errorSchema, this.props.extraErrors);
                errors = toErrorList(errorSchema);
            }
            state = { formData: newFormData, errors, errorSchema };
        } else if (!this.props.noValidate && newErrorSchema) {
            const errorSchema = this.props.extraErrors
                ? mergeObjects(newErrorSchema, this.props.extraErrors)
                : newErrorSchema;
            state = {
                formData: newFormData,
                errorSchema: errorSchema,
                errors: toErrorList(errorSchema),
            };
        }
        this.setState(
            state,
            () => this.props.onChange && this.props.onChange(state)
        );
    };

    onBlur = (...args) => {
        if (this.props.onBlur) {
            this.props.onBlur(...args);
        }
    };

    onFocus = (...args) => {
        if (this.props.onFocus) {
            this.props.onFocus(...args);
        }
    };

    onSubmit = event => {
        event.preventDefault();
        if (event.target !== event.currentTarget) {
            return;
        }

        event.persist();
        let newFormData = this.state.formData;

        if (this.props.omitExtraData === true) {
            const retrievedSchema = retrieveSchema(
                this.state.schema,
                this.state.schema.definitions,
                newFormData
            );
            const pathSchema = toPathSchema(
                retrievedSchema,
                "",
                this.state.schema.definitions,
                newFormData
            );

            const fieldNames = this.getFieldNames(pathSchema, newFormData);

            newFormData = this.getUsedFormData(newFormData, fieldNames);
        }

        if (!this.props.noValidate) {
            let { errors, errorSchema } = this.validate(newFormData);
            if (Object.keys(errors).length > 0) {
                if (this.props.extraErrors) {
                    errorSchema = mergeObjects(errorSchema, this.props.extraErrors);
                    errors = toErrorList(errorSchema);
                }
                this.setState({ errors, errorSchema }, () => {
                    if (this.props.onError) {
                        this.props.onError(errors);
                    } else {
                        console.error("Form validation failed", errors);
                    }
                });
                return;
            }
        }

        let errorSchema;
        let errors;
        if (this.props.extraErrors) {
            errorSchema = this.props.extraErrors;
            errors = toErrorList(errorSchema);
        } else {
            errorSchema = {};
            errors = [];
        }

        this.setState(
            { formData: newFormData, errors: errors, errorSchema: errorSchema },
            () => {
                if (this.props.onSubmit) {
                    this.props.onSubmit(
                        { ...this.state, formData: newFormData, status: "submitted" },
                        event
                    );
                }
            }
        );
    };

    getRegistry() {
        // For BC, accept passed SchemaField and TitleField props and pass them to
        // the "fields" registry one.
        const { fields, widgets } = getDefaultRegistry();
        return {
            fields: { ...fields, ...this.props.fields },
            widgets: { ...widgets, ...this.props.widgets },
            ArrayFieldTemplate: this.props.ArrayFieldTemplate,
            ObjectFieldTemplate: this.props.ObjectFieldTemplate,
            FieldTemplate: this.props.FieldTemplate,
            definitions: this.props.schema.definitions || {},
            formContext: this.props.formContext || {},
        };
    }

    submit() {
        if (this.formElement) {
            this.formElement.dispatchEvent(
                new CustomEvent("submit", {
                    cancelable: true,
                })
            );
        }
    }

    render() {
        const {
            children,
            id,
            idPrefix,
            className,
            tagName,
            name,
            method,
            target,
            action,
            autocomplete: deprecatedAutocomplete,
            autoComplete: currentAutoComplete,
            enctype,
            acceptcharset,
            noHtml5Validate,
            disabled,
            formContext,
        } = this.props;

        const { schema, uiSchema, formData, errorSchema, idSchema } = this.state;
        const registry = this.getRegistry();
        const _SchemaField = registry.fields.SchemaField;
        const FormTag = tagName ? tagName : "form";
        if (deprecatedAutocomplete) {
            console.warn(
                "Using autocomplete property of Form is deprecated, use autoComplete instead."
            );
        }
        const autoComplete = currentAutoComplete
            ? currentAutoComplete
            : deprecatedAutocomplete;

        return (
            <FormTag
                className={className ? className : "rjsf"}
                id={id}
                name={name}
                method={method}
                target={target}
                action={action}
                autoComplete={autoComplete}
                encType={enctype}
                acceptCharset={acceptcharset}
                noValidate={noHtml5Validate}
                onSubmit={this.onSubmit}
                ref={form => {
                    this.formElement = form;
                }}>
                {this.renderErrors()}
                <_SchemaField
                    schema={schema}
                    uiSchema={uiSchema}
                    errorSchema={errorSchema}
                    idSchema={idSchema}
                    idPrefix={idPrefix}
                    formContext={formContext}
                    formData={formData}
                    onChange={this.onChange}
                    onBlur={this.onBlur}
                    onFocus={this.onFocus}
                    registry={registry}
                    disabled={disabled}
                />
                {children ? (
                    children
                ) : (
                        <div>
                            <button type="submit" className="btn btn-info">
                                Submit
                  </button>
                        </div>
                    )}
            </FormTag>
        );
    }
}


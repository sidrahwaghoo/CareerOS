// Zod validation middleware factory.
// Wire it in routes/controllers as, for example:
//   const { validateBody, validateParams } = require('../middleware/validate');
//   const { schemas } = require('../schemas');
//   router.post('/', validateBody(schemas.matchRequest), controller.create);
//   router.post('/:id/approve', validateParams(schemas.draftIdParam), controller.approve);

function formatIssues(error) {
  if (!error || !Array.isArray(error.issues)) return ['Invalid input'];
  return error.issues.map((issue) => {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Generic validator.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'params'|'query'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = formatIssues(result.error);
      console.warn(`[Validation 400] ${req.method} ${req.originalUrl}:`, issues);
      return res.status(400).json({
        error: 'Validation failed',
        source,
        details: issues,
      });
    }
    // Do not replace req[source] with the parsed value: zod strips unknown
    // keys by default and controllers may rely on extra fields (e.g. ids,
    // timestamps) that the schema intentionally allows through.
    return next();
  };
}

function validateBody(schema) {
  return validate(schema, 'body');
}

function validateParams(schema) {
  return validate(schema, 'params');
}

function validateQuery(schema) {
  return validate(schema, 'query');
}

module.exports = { validate, validateBody, validateParams, validateQuery, formatIssues };

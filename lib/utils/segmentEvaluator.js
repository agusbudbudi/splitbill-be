/**
 * Utility to evaluate dynamic segments into Mongoose queries or aggregation pipelines.
 */

// Operator mapping to MongoDB query operators
const operatorMap = {
  eq: "$eq",
  ne: "$ne",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte",
  // 'contains' will use $regex in the evaluator
};

/**
 * Translates a single rule into a MongoDB condition
 * @param {Object} rule - { field, operator, value }
 * @returns {Object} MongoDB condition
 */
function translateRule(rule) {
  const { field, operator, value } = rule;

  if (operator === "contains") {
    return { [field]: { $regex: value, $options: "i" } };
  }

  const mongoOp = operatorMap[operator];
  if (!mongoOp) {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  return { [field]: { [mongoOp]: value } };
}

/**
 * Translates an array of condition groups into a single MongoDB condition object using $and/$or
 * @param {Array} groups - Array of ConditionGroup objects
 * @returns {Object|null} MongoDB condition object or null if empty
 */
function translateConditionGroups(groups) {
  if (!groups || groups.length === 0) return null;

  const groupConditions = groups.map((group) => {
    if (!group.rules || group.rules.length === 0) return null;

    const ruleConditions = group.rules.map(translateRule);
    
    // If only one rule, don't wrap in $and / $or
    if (ruleConditions.length === 1) {
      return ruleConditions[0];
    }

    return group.operator === "OR" 
      ? { $or: ruleConditions } 
      : { $and: ruleConditions };
  }).filter(Boolean);

  if (groupConditions.length === 0) return null;
  if (groupConditions.length === 1) return groupConditions[0];

  // Between groups, we apply AND logic (e.g. Group1 AND Group2)
  return { $and: groupConditions };
}

/**
 * Parses dynamic segment configuration and returns a Mongoose aggregation pipeline
 * @param {Object} dynamicSegment - { included: [], excluded: [] }
 * @returns {Array} Aggregation pipeline array
 */
export function buildSegmentPipeline(dynamicSegment) {
  const { included = [], excluded = [] } = dynamicSegment;
  const pipeline = [];

  // Check if we need to aggregate relational data (e.g., splitBillCount)
  // We do this by checking if any rule in included or excluded references 'splitBillCount'
  const hasSplitBillCount = [...included, ...excluded].some((group) =>
    group.rules.some((rule) => rule.field === "splitBillCount")
  );

  if (hasSplitBillCount) {
    pipeline.push({
      $lookup: {
        from: "splitbillrecords", // Make sure this matches your MongoDB collection name (usually lowercase, pluralized)
        localField: "_id",
        foreignField: "userId",
        as: "_splitBills",
      },
    });
    pipeline.push({
      $addFields: {
        splitBillCount: { $size: "$_splitBills" },
      },
    });
  }

  // Build the match conditions
  const includedCondition = translateConditionGroups(included);
  const excludedCondition = translateConditionGroups(excluded);

  const matchStage = {};

  if (includedCondition && excludedCondition) {
    // If both exist, use $and: [ included, { $nor: [excluded] } ] or similar
    matchStage.$and = [
      includedCondition,
      // Invert the excluded condition. If excluded is {$or: [{email:'a'}, {email:'b'}]}, we want it to NOT match.
      // Using $nor is effective for inverting complex logic.
      { $nor: [excludedCondition] }
    ];
  } else if (includedCondition) {
    Object.assign(matchStage, includedCondition);
  } else if (excludedCondition) {
    matchStage.$nor = [excludedCondition];
  } else {
    // If no rules, match everything (or nothing, depending on your business logic)
    // We'll default to everything here, but usually a campaign should have at least one included rule.
  }

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Remove the temporary fields added by aggregation if necessary
  if (hasSplitBillCount) {
    pipeline.push({
      $project: {
        _splitBills: 0,
        splitBillCount: 0,
      },
    });
  }

  return pipeline;
}

package v4

import (
	"fmt"
	"time"

	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/cumulative"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/delta"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// PrepareMetricQuery prepares the query to be used for fetching metrics
// from the database
// start and end are in milliseconds
// step is in seconds
func PrepareMetricQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, options metricsV3.Options) (string, error) {

	start, end = common.AdjustedMetricTimeRange(start, end, mq.StepInterval, mq.TimeAggregation)

	groupBy := helpers.GroupByAttributeKeyTags(mq.GroupBy...)
	orderBy := helpers.OrderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)

	if mq.Quantile != 0 {
		// If quantile is set, we need to group by le
		// and set the space aggregation to sum
		// and time aggregation to rate
		mq.TimeAggregation = v3.TimeAggregationRate
		mq.SpaceAggregation = v3.SpaceAggregationSum
		mq.GroupBy = append(mq.GroupBy, v3.AttributeKey{
			Key:      "le",
			Type:     v3.AttributeKeyTypeTag,
			DataType: v3.AttributeKeyDataTypeString,
		})
	}

	var query string
	var err error
	if mq.Temporality == v3.Delta {
		if panelType == v3.PanelTypeTable {
			query, err = delta.PrepareMetricQueryDeltaTable(start, end, mq.StepInterval, mq)
		} else {
			query, err = delta.PrepareMetricQueryDeltaTimeSeries(start, end, mq.StepInterval, mq)
		}
	} else {
		if panelType == v3.PanelTypeTable {
			query, err = cumulative.PrepareMetricQueryCumulativeTable(start, end, mq.StepInterval, mq)
		} else {
			query, err = cumulative.PrepareMetricQueryCumulativeTimeSeries(start, end, mq.StepInterval, mq)
		}
	}

	if err != nil {
		return "", err
	}

	if mq.Quantile != 0 {
		query = fmt.Sprintf(`SELECT %s, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) as value FROM (%s) GROUP BY %s ORDER BY %s`, groupBy, mq.Quantile, query, groupBy, orderBy)
	}

	return query, nil
}

func BuildPromQuery(promQuery *v3.PromQuery, step, start, end int64) *model.QueryRangeParams {
	return &model.QueryRangeParams{
		Query: promQuery.Query,
		Start: time.UnixMilli(start),
		End:   time.UnixMilli(end),
		Step:  time.Duration(step * int64(time.Second)),
	}
}

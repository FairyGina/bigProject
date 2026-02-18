import { useEffect, useState } from 'react';
import axiosInstance from '../axiosConfig';

const buildScoreData = (results, selectedReports) =>
    results
        .map((result, index) => {
            if (!result || result.status !== 'fulfilled') {
                return null;
            }
            const res = result.value;
            const data = res.data || {};
            const evaluations = data.report?.evaluationResults || [];
            const totalCount = evaluations.length || 1;
            const sums = evaluations.reduce(
                (acc, item) => {
                    acc.total += Number(item.totalScore || 0);
                    acc.taste += Number(item.tasteScore || 0);
                    acc.price += Number(item.priceScore || 0);
                    acc.health += Number(item.healthScore || 0);
                    return acc;
                },
                { total: 0, taste: 0, price: 0, health: 0 }
            );
            return {
                recipeId: data.recipeId || data.id,
                title: data.recipeTitle || data.title || selectedReports[index]?.recipeTitle || `레시피 ${index + 1}`,
                scores: [
                    Math.round(sums.total / totalCount),
                    Math.round(sums.taste / totalCount),
                    Math.round(sums.price / totalCount),
                    Math.round(sums.health / totalCount),
                ],
                countryScores: Array.isArray(data.report?.evaluationResults)
                    ? data.report.evaluationResults
                        .map((item) => ({
                            country: item?.country,
                            totalScore: Number(item?.totalScore),
                            tasteScore: Number(item?.tasteScore),
                            priceScore: Number(item?.priceScore),
                            healthScore: Number(item?.healthScore),
                        }))
                        .filter((item) => item.country)
                    : [],
            };
        })
        .filter(Boolean);

const hasEvaluation = (scoreItems) =>
    scoreItems.some(
        (item) =>
            item.scores.some((value) => value > 0) ||
            (item.countryScores && item.countryScores.length > 0)
    );

export const useEvaluationScores = ({ reportIds, recipeIds, selectedReports }) => {
    const [scoreData, setScoreData] = useState([]);
    const [scoreLoading, setScoreLoading] = useState(false);

    useEffect(() => {
        const fetchScores = async () => {
            if (!reportIds.length && !recipeIds.length) {
                return;
            }
            try {
                setScoreLoading(true);
                if (reportIds.length) {
                    const results = await Promise.allSettled(
                        reportIds.map((id) => axiosInstance.get(`/api/report/${id}`))
                    );
                    const mapped = buildScoreData(results, selectedReports);
                    setScoreData(mapped);
                    if (!hasEvaluation(mapped) && recipeIds.length) {
                        const fallback = await Promise.allSettled(
                            recipeIds.map((id) => axiosInstance.get(`/api/recipes/${id}`))
                        );
                        setScoreData(buildScoreData(fallback, selectedReports));
                    }
                } else if (recipeIds.length) {
                    const results = await Promise.allSettled(
                        recipeIds.map((id) => axiosInstance.get(`/api/recipes/${id}`))
                    );
                    setScoreData(buildScoreData(results, selectedReports));
                }
            } catch (err) {
                console.error('평가 점수 정보를 불러오지 못했습니다.', err);
            } finally {
                setScoreLoading(false);
            }
        };

        fetchScores();
    }, [reportIds, recipeIds, selectedReports]);

    return { scoreData, scoreLoading };
};

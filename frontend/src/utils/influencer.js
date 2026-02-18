export const pickInfluencerForImage = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }
    return (
        items.find((item) => item?.name && item?.imageUrl) ||
        items.find((item) => item?.name) ||
        null
    );
};

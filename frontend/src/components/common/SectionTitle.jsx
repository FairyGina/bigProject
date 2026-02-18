import React from 'react';
import HelpTooltip from './HelpTooltip';

const SectionTitle = ({ title, help, tooltipAlign = 'center', tooltipWidth, tooltipMargin }) => {
    return (
        <h3 className="text-lg font-semibold text-[color:var(--text)] mb-3 flex items-center">
            {title}
            {help && (
                <HelpTooltip
                    label={title}
                    description={help}
                    align={tooltipAlign}
                    width={tooltipWidth}
                    margin={tooltipMargin}
                />
            )}
        </h3>
    );
};

export default SectionTitle;

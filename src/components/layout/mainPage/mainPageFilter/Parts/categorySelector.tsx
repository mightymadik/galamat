import React from "react";

interface CategorySelectorProps {
    categories: string[];
    activeCategory: string | null;
    setActiveCategory: (category: string | null) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    categories,
    activeCategory,
    setActiveCategory,
}) => {
    return (
        <div className="mainPageFilterCategories w-full flex items-start gap-[8px]">
            <div className="mobileCategoriesRow w-full grid grid-cols-3 gap-2 lg:flex">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                        className={`mainPageFilterCategory [font-size:_clamp(11px,3vw,15px)] flex h-8 justify-center items-center bg-gray-100 transition-all duration-300 hover:!bg-blue-900 hover:text-white cursor-pointer ${activeCategory === category
                            ? "!bg-blue-900 text-white"
                            : "font-normal"}`}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>
    );
};

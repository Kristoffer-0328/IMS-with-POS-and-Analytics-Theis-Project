import React, { useState, useEffect } from 'react';
import { getCategoryFields } from './Utils';

const CategoryFieldManager = ({ categoryName, onUpdate }) => {
    const [fields, setFields] = useState([]);

    useEffect(() => {
        loadFields();
    }, [categoryName]);

    const loadFields = async () => {
        const categoryFields = await getCategoryFields(categoryName);
        setFields(categoryFields);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Category Fields (Read-Only)</h3>
            
            {fields.map(field => (
                <div key={field.name} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">{field.name}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {field.type}
                        </span>
                    </div>

                    {field.type === 'select' && (
                        <div className="flex flex-wrap gap-2">
                            {field.options.map(option => (
                                <span 
                                    key={option}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {option}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CategoryFieldManager;

import React, { useState, useEffect } from 'react';
import { getCategoryFields, updateFieldOptions } from './Utils';

const CategoryFieldManager = ({ categoryName, onUpdate }) => {
    const [fields, setFields] = useState([]);
    const [editingField, setEditingField] = useState(null);
    const [newOption, setNewOption] = useState('');

    useEffect(() => {
        loadFields();
    }, [categoryName]);

    const loadFields = async () => {
        const categoryFields = await getCategoryFields(categoryName);
        setFields(categoryFields);
    };

    const handleAddOption = async (fieldName, currentOptions) => {
        if (!newOption.trim()) return;
        
        const updatedOptions = [...currentOptions, newOption.trim()];
        const success = await updateFieldOptions(categoryName, fieldName, updatedOptions);
        
        if (success) {
            await loadFields();
            setNewOption('');
            setEditingField(null);
        }
    };

    const handleRemoveOption = async (fieldName, currentOptions, optionToRemove) => {
        const updatedOptions = currentOptions.filter(opt => opt !== optionToRemove);
        const success = await updateFieldOptions(categoryName, fieldName, updatedOptions);
        
        if (success) {
            await loadFields();
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Category Fields Manager</h3>
            
            {fields.map(field => (
                <div key={field.name} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">{field.name}</h4>
                        {field.editable && (
                            <button
                                onClick={() => setEditingField(field.name)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                                Edit Options
                            </button>
                        )}
                    </div>

                    {field.type === 'select' && (
                        <div className="flex flex-wrap gap-2">
                            {field.options.map(option => (
                                <span 
                                    key={option}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {option}
                                    {editingField === field.name && (
                                        <button
                                            onClick={() => handleRemoveOption(field.name, field.options, option)}
                                            className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    {editingField === field.name && (
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="text"
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                placeholder="Add new option"
                                className="flex-1 px-3 py-1 border rounded-lg text-sm"
                            />
                            <button
                                onClick={() => handleAddOption(field.name, field.options)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CategoryFieldManager;
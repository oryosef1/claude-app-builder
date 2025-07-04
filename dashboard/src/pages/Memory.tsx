import React, { useState, useEffect } from 'react';
import MemoryEditor from '../components/MemoryEditor';
import { apiService } from '../services/api';

const Memory: React.FC = () => {
  const [memoryContent, setMemoryContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load memory content from memory.md file
    const loadMemoryContent = async () => {
      try {
        const content = await apiService.getMemoryContent();
        setMemoryContent(content);
      } catch (err) {
        setError('Failed to load memory content');
        setMemoryContent('# Memory\n\nMemory content will be loaded here.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMemoryContent();
  }, []);

  const handleMemoryChange = async (newContent: string) => {
    try {
      const result = await apiService.saveMemoryContent();
      if (result.success) {
        setMemoryContent(newContent);
        setError('');
      } else {
        setError('Failed to save memory content');
      }
    } catch (err) {
      setError('Failed to save memory content');
    }
  };

  if (isLoading) {
    return <div className="memory-page"><h1>Memory Editor</h1><p>Loading...</p></div>;
  }

  return (
    <div className="memory-page">
      <h1>Memory Editor</h1>
      {error && <div className="error">{error}</div>}
      <MemoryEditor
        value={memoryContent}
        onChange={handleMemoryChange}
      />
    </div>
  );
};

export default Memory;

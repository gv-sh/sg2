import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config.js';
import '../../index.css';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/card.tsx';
import { Button, Select } from '../../shared/components/ui/form-controls.js';
import { Badge } from '../../shared/components/ui/badge.tsx';
import { useToast } from '../../shared/contexts/ToastContext.jsx';
import { RefreshCw, Instagram, Palette, FileImage } from 'lucide-react';

function InstagramPreview() {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const toast = useToast();

  // Fetch recent stories
  const fetchStories = useCallback(async () => {
    try {
      setIsLoadingStories(true);
      const response = await axios.get(`${config.API_URL}/api/content?limit=20`);
      
      if (response.data?.success && response.data?.data) {
        setStories(response.data.data);
        // Don't auto-select any story - let user choose manually
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
      toast.error('Failed to load stories. Please try again.');
    } finally {
      setIsLoadingStories(false);
    }
  }, [selectedStory, toast]);

  // Generate Instagram preview
  const generatePreview = useCallback(async (story) => {
    if (!story) return;
    
    try {
      setIsLoading(true);
      const response = await axios.post(`${config.API_URL}/api/admin/instagram/preview`, {
        storyId: story.id
      });
      
      if (response.data?.success && response.data?.data) {
        setPreviewData(response.data.data);
        toast.success('Instagram preview generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      toast.error('Failed to generate Instagram preview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load stories on component mount
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Don't auto-generate preview - only generate when user explicitly requests it

  // Handle story selection change
  const handleStoryChange = (e) => {
    const storyId = e.target.value;
    const story = stories.find(s => s.id === storyId);
    setSelectedStory(story);
    setPreviewData(null); // Clear previous preview when changing stories
  };

  // Get theme colors for display - use actual design settings if available
  const getThemeDisplay = (themeName, designSettings = null) => {
    if (designSettings && themeName === 'custom') {
      // Return actual design settings colors
      return {
        primary: designSettings.colors.primary_text,
        secondary: designSettings.colors.content_text,
        accent: designSettings.colors.accent_border
      };
    }
    
    const themes = {
      cyberpunk: { primary: '#ff0080', secondary: '#00ffff', accent: '#ffff00' },
      nature: { primary: '#22c55e', secondary: '#059669', accent: '#fbbf24' },
      space: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#f59e0b' },
      dystopian: { primary: '#ef4444', secondary: '#dc2626', accent: '#f97316' },
      utopian: { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#06b6d4' },
      custom: { primary: '#0a0a0a', secondary: '#1a1a1a', accent: '#0a0a0a' }, // Default custom theme
      default: { primary: '#6366f1', secondary: '#4f46e5', accent: '#a78bfa' }
    };
    
    return themes[themeName] || themes.default;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Instagram Preview</h1>
        <div className="flex items-center space-x-2">
          {selectedStory && (
            <Button 
              onClick={() => generatePreview(selectedStory)} 
              variant="default" 
              size="sm" 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {previewData ? 'Regenerate Preview' : 'Generate Preview'}
            </Button>
          )}
          <Button 
            onClick={fetchStories} 
            variant="outline" 
            size="sm" 
            disabled={isLoadingStories}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStories ? 'animate-spin' : ''}`} />
            Refresh Stories
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Select a story and generate a preview to see how it would appear as an Instagram carousel post. 
        Previews are generated on-demand when you click "Generate Preview".
      </p>

      {/* Story Selection */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Select Story</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="storySelect" className="text-sm font-medium mb-2 block">
                Choose a story to preview:
              </label>
              <Select
                id="storySelect"
                value={selectedStory?.id || ''}
                onChange={handleStoryChange}
                disabled={isLoadingStories}
              >
                <option value="" disabled>
                  {isLoadingStories ? 'Loading stories...' : 'Select a story'}
                </option>
                {stories.map(story => (
                  <option key={story.id} value={story.id}>
                    {story.title} - {new Date(story.created_at).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </div>
            
            {selectedStory && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Title:</span> {selectedStory.title}
                  </div>
                  <div>
                    <span className="font-medium">Year:</span> {selectedStory.year || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(selectedStory.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-medium">Content Preview:</span> 
                  <span className="text-muted-foreground ml-2">
                    {selectedStory.fiction_content?.substring(0, 150)}...
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="shadow-sm">
          <CardContent className="py-8">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Generating Instagram preview...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Results */}
      {previewData && !isLoading && (
        <>
          {/* Technical Details */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileImage className="h-5 w-5 mr-2" />
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Slide Count</div>
                  <div className="text-lg">{previewData.slideCount}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Theme Detected</div>
                  <div className="text-lg capitalize">{previewData.theme || 'default'}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Dimensions</div>
                  <div className="text-lg">1080×1080</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Format</div>
                  <div className="text-lg">PNG</div>
                </div>
              </div>

              {/* Color Palette */}
              {previewData.theme && (
                <div className="mt-6">
                  <div className="flex items-center mb-3">
                    <Palette className="h-4 w-4 mr-2" />
                    <span className="font-medium">Color Palette</span>
                  </div>
                  <div className="flex space-x-4">
                    {Object.entries(getThemeDisplay(previewData.theme, previewData.designSettings)).map(([name, color]) => (
                      <div key={name} className="flex items-center space-x-2">
                        <div 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm capitalize">{name}</span>
                        <span className="text-xs text-muted-foreground">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Slide Previews */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Instagram className="h-5 w-5 mr-2" />
                Carousel Slides Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewData.slides?.map((slide, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Slide {index + 1}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {slide.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="aspect-square relative overflow-hidden bg-gray-50">
                      {slide.previewImage ? (
                        <img 
                          src={slide.previewImage} 
                          alt={`Slide ${index + 1} preview`}
                          className="w-full h-full object-cover"
                        />
                      ) : slide.previewError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-red-50">
                          <div className="text-red-600 text-xs font-medium mb-2">Preview Error</div>
                          <div className="text-red-500 text-xs mb-3">{slide.previewError}</div>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-auto"
                            onClick={() => generatePreview(selectedStory)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full h-full relative">
                          <div className="absolute top-2 left-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded z-10">
                            HTML Preview
                          </div>
                          <div 
                            className="w-full h-full scale-[0.3] origin-top-left"
                            style={{ 
                              width: '333%', 
                              height: '333%',
                              transformOrigin: 'top left',
                              transform: 'scale(0.3)'
                            }}
                            dangerouslySetInnerHTML={{ __html: slide.html }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Caption Preview */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Generated Caption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {previewData.caption}
                </pre>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Character count: {previewData.caption?.length || 0}/2200
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Preview State */}
      {!previewData && !isLoading && selectedStory && (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Ready to generate Instagram preview</p>
            <p className="text-xs">Click "Generate Preview" above to create carousel slides for this story.</p>
          </CardContent>
        </Card>
      )}

      {/* No Story Selected State */}
      {!selectedStory && !isLoadingStories && (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No story selected</p>
            <p className="text-xs">Choose a story from the dropdown above to begin generating Instagram previews.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InstagramPreview;
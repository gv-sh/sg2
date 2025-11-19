// src/components/stories/StoryViewer.jsx
import React from 'react';
import { Button } from '../ui/button';
import {
  Calendar,
  Download,
  Share,
  RefreshCw,
  PlusCircle,
  Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';

// Format date helper function (moved outside component for reuse in PDF generation)
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
};

const StoryViewer = ({ 
  story, 
  onRegenerateStory, 
  onCreateNew, 
  loading
}) => {
  const navigate = useNavigate();
  
  // Handle regenerate button click
  const handleRegenerateClick = () => {
    // Navigate to the generating page first
    navigate('/generating');
    
    // Then call the regeneration function
    onRegenerateStory();
  };
  // Parse content into paragraphs
  const contentParagraphs = story.content ? 
    story.content.split('\n\n').filter(p => p.trim()) : [];
  
  // Copy to clipboard function
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('Fallback copy failed: ', err);
        document.body.removeChild(textArea);
        return false;
      }
    }
  };
  
  // Share content function
  const shareContent = async (shareData) => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        console.error('Error sharing:', err);
        return false;
      }
    } else {
      console.warn('Web Share API not supported');
      return false;
    }
  };
  
  // Enhanced image handling function
  const getStoryImage = (story) => {
    if (!story) return null;
    
    // Handle base64 image data
    if (story.imageData) {
      if (typeof story.imageData === 'string') {
        // If it already starts with data:image, it's already properly formatted
        if (story.imageData.startsWith('data:image')) {
          return story.imageData;
        } 
        // Otherwise, assume it's raw base64 and add proper prefix
        return `data:image/png;base64,${story.imageData}`;
      }
    }
    
    // Handle image URL if that's what the API returns
    if (story.imageUrl) {
      return story.imageUrl;
    }
    
    return null;
  };

  // Get the image source
  const imageSource = getStoryImage(story);
  

  // Handle share button click
  const handleShare = async () => {
    const shareData = {
      title: story.title,
      text: `${story.title} - Year ${story.year}\n\n${story.content.substring(0, 100)}...`,
      url: window.location.href
    };
    
    // Try to use Web Share API
    const shared = await shareContent(shareData);
    
    // Fallback to copy to clipboard if sharing fails
    if (!shared) {
      const shareText = `${story.title} - Year ${story.year}\n\n${story.content}`;
      copyToClipboard(shareText);
      // You would need to show a toast/notification here
      alert("Text copied to clipboard for sharing");
    }
  };
  
  return (
    <div className="container max-w-6xl mx-auto h-full flex flex-col" id={'jsx-template'}>
      {/* Header */}
      <header className="py-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{story.title}</h1>
            <div className="flex items-center text-muted-foreground">
              {/* Only year here, not date */}
              <span>Year {story.year}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRegenerateClick}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateNew}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Story
            </Button>
          </div>
        </div>
      </header>
      
      <div className="py-8">
        <div className="prose prose-lg max-w-3xl mx-auto">
          {imageSource && (
            <div className="mb-8 not-prose">
              <img 
                src={imageSource} 
                alt={story.title} 
                className="w-full h-auto rounded-lg shadow-md"
                onError={(e) => {
                  console.error("Story image failed to load:", imageSource);
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                }}
              />
            </div>
          )}
          
          {contentParagraphs.map((paragraph, index) => {
            // Skip title paragraphs
            if (paragraph.includes('**Title:')) {
              return null;
            }
            return (
              <p key={index} className=" text-sm/8  mb-4">{paragraph}</p>
            );
          })}
        </div>
      </div>
      
      {/* Footer with actions */}
      <footer className="py-6 border-t mt-auto">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              // onClick={handleDownload}
              onClick={() =>
                downloadStyledPDF({
                  story: { title: story.title, year: story.year, createdAt: story.createdAt },
                  imageSource: imageSource,
                  contentParagraphs: contentParagraphs
                })
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() =>
                printStyledPDF({
                  story: { title: story.title, year: story.year, createdAt: story.createdAt },
                  imageSource: imageSource,
                  contentParagraphs: contentParagraphs
                })
              }
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>

            
          </div>
          
          {/* Collection info with date moved here */}
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span>{formatDate(story.createdAt)}</span>
              <span className="mx-2">•</span>
              <span className="text-primary">Speculative Fiction</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StoryViewer;

const preload = src =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });

const downloadStyledPDF = async ({ story, imageSource, contentParagraphs, returnInstance = false }) => {
  const pageParagraphCount = 10; // Adjust this based on visual size
  const pageChunks = [];

  for (let i = 1; i < contentParagraphs.length; i += pageParagraphCount) {
    pageChunks.push(contentParagraphs.slice(i, i + pageParagraphCount));
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();


  for (let pageIndex = 0; pageIndex < pageChunks.length; pageIndex++) {
    const container = document.createElement('div');
    container.id = `pdf-render-container-${pageIndex}`;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.padding = '10mm';
    container.style.backgroundColor = '#fff';
    container.style.columnCount = '1';
    container.style.columnGap = '40px';
    container.style.fontSize = '10px';
    container.style.lineHeight = '1.8';
    document.body.appendChild(container);

  // before rendering the page with the image:
  if (imageSource) await preload(imageSource);

    const jsxContent = (
      <div>
        {pageIndex === 0 && (
          <>

            {imageSource && (
              <div className="not-prose w-3/4 mx-auto h-[450px] mb-5 rounded-sm shadow-md relative overflow-hidden">
                <img
                  src={imageSource}
                  alt={story.title}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full"
                />
              </div>
            )}
            <h1 className="mx-auto w-3/4 text-2xl text-gray-900 font-bold mb-2 tracking-tight ">{story.title}</h1>
            <p className="mx-auto w-3/4 text-gray-500 mb-4 text-base ">Year {story.year}</p>
              
          </>
        )}

        {pageChunks[pageIndex].map((paragraph, idx) => (
          <p key={idx} className="w-3/4 mb-5 mx-auto text-[13px] text-gray-900 font-worksans leading-relaxed">
            {paragraph}
          </p>
        ))}

       
        <div className="w-3/4 mx-auto flex items-center text-[10px] text-gray-700 space-x-2 text-sm border-t mt-10 mb-2">
          <span>Created on</span>
          <span>{formatDate(story.createdAt)}</span>
          <span>|</span>
          <span>Futures of Hope</span>
        </div>
        

      </div>

      

    );

    const root = ReactDOM.createRoot(container);
    root.render(jsxContent);
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
      backgroundColor: '#fff',
      windowWidth: container.scrollWidth
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    const scaledWidth = pageWidth;
    const scaledHeight = (canvas.height * scaledWidth) / canvas.width;

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, scaledWidth, scaledHeight);

    root.unmount();
    document.body.removeChild(container);
  }

  const safeTitle = story.title.replace(/\s+/g, '_').toLowerCase();

  if (returnInstance) {
    return pdf;
  } else {
    pdf.save(`${safeTitle}.pdf`);
  }
};

const printStyledPDF = async ({ story, imageSource, contentParagraphs }) => {
  const pdf = await downloadStyledPDF({
    story,
    imageSource,
    contentParagraphs,
    returnInstance: true // enable PDF return instead of save
  });

  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl);
  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
  };
};

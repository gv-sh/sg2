/**
 * InstagramHandleDialog - Modal dialog for entering Instagram handle after successful share
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button.tsx';
import { Input } from '../../ui/input.tsx';
import { AtSign, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert.tsx';
import axios from 'axios';

const InstagramHandleDialog = ({ 
  isOpen, 
  onClose, 
  postId, 
  onComplete 
}) => {
  const [handle, setHandle] = useState('');
  const [submitState, setSubmitState] = useState('ready'); // ready, submitting, success, error
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!handle.trim() || submitState === 'submitting') return;

    try {
      setSubmitState('submitting');
      setError(null);

      // Clean handle - remove @ if user added it, we'll add it in the API
      const cleanHandle = handle.trim().replace(/^@/, '');
      
      if (cleanHandle.length === 0) {
        throw new Error('Please enter a valid Instagram handle');
      }

      // Call Instagram comment API
      const response = await axios.post('/api/instagram/comment', {
        postId: postId,
        handle: cleanHandle
      });

      if (response.data.success) {
        setSubmitState('success');
        
        // Wait a moment to show success, then call completion callback
        setTimeout(() => {
          if (onComplete) {
            onComplete({
              commentId: response.data.data.commentId,
              handle: response.data.data.handle
            });
          }
          onClose();
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Instagram comment error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add handle comment');
      setSubmitState('error');
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete({ skipped: true });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <AtSign className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Connect on Instagram</h3>
          </div>
          
          {submitState !== 'submitting' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Your story has been shared as an Instagram carousel! 🎉</p>
            <p>Add your Instagram handle as a comment so people can connect with you.</p>
          </div>

          {submitState === 'success' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-green-600 font-medium">Comment added successfully!</div>
              <div className="text-sm text-muted-foreground mt-1">
                Your handle has been posted as a reply to the carousel.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="instagram-handle" className="text-sm font-medium">
                  Instagram Handle
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="instagram-handle"
                    type="text"
                    placeholder="your_username"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="pl-10"
                    disabled={submitState === 'submitting'}
                    autoFocus
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Enter your Instagram username (without the @)
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={!handle.trim() || submitState === 'submitting'}
                  className="flex-1"
                >
                  {submitState === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding comment...
                    </>
                  ) : (
                    <>
                      <AtSign className="h-4 w-4 mr-2" />
                      Add my handle
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={submitState === 'submitting'}
                  className="px-6"
                >
                  Skip
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                This will post a comment: "Connect with me: @your_username"
              </div>
            </form>
          )}

          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">Privacy Note</span>
            </div>
            <div className="mt-1">
              Your handle will be public on Instagram. You can always delete the comment later if needed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramHandleDialog;
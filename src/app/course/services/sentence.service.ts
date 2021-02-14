import { Injectable, OnDestroy } from '@angular/core';
import { gql } from 'apollo-angular';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { AddSentenceGQL,
  AddSentenceInput,
  AddTranslationInput,
  AddTranslationGQL,
  TranslationGQL,
  Sentence,
  DeleteTranslationGQL,
  Lesson
} from '../../generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class SentenceService implements OnDestroy {
  private destroy$ = new Subject<boolean>();

  constructor(private translationGQL: TranslationGQL, private addSentenceGQL: AddSentenceGQL,
              private addTranslationGQL: AddTranslationGQL,
              private deleteTranslationGQL: DeleteTranslationGQL) { }

  getTranslation(sentenceId: string, languageId: string): any {
    return this.translationGQL.watch({
      sentenceId,
      languageId
    }, {})
    .valueChanges
    .pipe(
      map(({ data }) => data.getTranslation),
      takeUntil(this.destroy$)
    );
  }

  addSentence(lesson: Lesson, newSentence: AddSentenceInput): any {
    return this.addSentenceGQL.mutate({
      newSentence
    }, {
      update: (cache, { data }) => {
        const returnedSentence = data?.addSentence;
        cache.modify({
          id: cache.identify(lesson),
          fields: {
            sentences(existingSentenceRefs = [], { readField }): any[] {
              const newSentenceRef = cache.writeFragment({
                data: returnedSentence,
                fragment: gql`
                  fragment NewSentence on Sentence {
                    id
                    text
                  }
                `
              });
              // Quick safety check - if the new sentence is already
              // present in the cache, we don't need to add it again.
              if (returnedSentence && existingSentenceRefs.some(
                (ref: any) => readField('id', ref) === returnedSentence.id
              )) {
                return existingSentenceRefs;
              }
              return [...existingSentenceRefs, newSentenceRef];
            }
          }
        });
      }
    })
    .pipe(
      map(({ data }) => data?.addSentence),
      takeUntil(this.destroy$)
    );
  }

  addTranslate(sentence: Sentence, newTranslation: AddTranslationInput): any {
    return this.addTranslationGQL.mutate({
      newTranslation
    }, {
      update: (cache, { data }) => {
        const returnedTranslation = data?.addTranslation;
        cache.modify({
          id: cache.identify(sentence),
          fields: {
            availableTranslations(existingLanguageRefs = [], { readField }): any[] {
              const newLanguageRef = cache.writeFragment({
                data: returnedTranslation,
                fragment: gql`
                  fragment NewLanguage on Language {
                    id
                    name
                  }
                `
              });
              // Quick safety check - if the new language is already
              // present in the cache, we don't need to add it again.
              if (returnedTranslation && existingLanguageRefs.some(
                (ref: any) => readField('id', ref) === returnedTranslation.id
              )) {
                return existingLanguageRefs;
              }
              return [...existingLanguageRefs, newLanguageRef]
                .sort((a, b) => {
                  const aName = a.name || '';
                  const bName = b.name || '';
                  return aName.localeCompare(bName);
                });
            }
          }
        });
      }
    })
    .pipe(
      map(({ data }) => data?.addTranslation),
      takeUntil(this.destroy$)
    );
  }

  deleteTranslate(sentence: Sentence, translationId: string): any {
    return this.deleteTranslationGQL.mutate({
      id: translationId
    }, {
      update: (cache, { data }) => {
        const returnedTranslation = data?.deleteTranslation;
        const language = data?.deleteTranslation?.language;

        cache.modify({
          id: cache.identify(sentence),
          fields: {
            availableTranslations(existingLanguageRefs = [], { readField }): any[] {
              return existingLanguageRefs.filter((ref: any) => language?.id !== readField('id', ref));
            }
          }
        });

        cache.modify({
          fields: {
            translation(existingTranslationRefs = [], { readField }): any[] {
              return existingTranslationRefs.filter((ref: any) => returnedTranslation?.id !== readField('id', ref));
            },
          }
        });
      }
    })
    .pipe(
      map(({ data }) => data?.deleteTranslation),
      takeUntil(this.destroy$)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
    console.log('sentence service - ngOnDestroy fired');
  }
}

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input,
    OnChanges, OnDestroy, forwardRef } from "@angular/core";
import {
    ControlValueAccessor,
    FormControl,
    NG_VALUE_ACCESSOR,
} from "@angular/forms";

import { RenderApplication, RenderEngine, RenderingContainerImage } from "app/models/rendering-container-image";
import { RenderingContainerImageService } from "app/services";
import { Observable, Subscription } from "rxjs";
import { map } from "rxjs/operators";
import "./rendering-container-image-picker.scss";

@Component({
    selector: "bl-rendering-container-image-picker",
    templateUrl: "rendering-container-image-picker.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() =>
            RenderingContainerImagePickerComponent), multi: true },
        RenderingContainerImageService,
    ],
})

export class RenderingContainerImagePickerComponent implements ControlValueAccessor, OnChanges, OnDestroy {

    public appVersionControl = new FormControl();
    public rendererVersionControl = new FormControl();

    public appVersions: string[];
    public containerImages: RenderingContainerImage[];

    public appVersionsData: Observable<string[]>;
    public containerImagesData: Observable<RenderingContainerImage[]>;
    public containerImage: string;

    @Input() public app: RenderApplication;
    @Input() public imageReferenceId: string;
    @Input() public renderEngine: RenderEngine;

    private _propagateChange: (value: string) => void = null;
    private _subs: Subscription[] = [];

    constructor(
        private changeDetector: ChangeDetectorRef,
        private renderingContainerImageService: RenderingContainerImageService) {

        this.renderingContainerImageService.loadImageData();

        this.appVersionsData = this.renderingContainerImageService.getAppVersionDisplayList(
            this.app, this.imageReferenceId);

        this.appVersionsData.subscribe((appVersions) => {
            this.appVersions = appVersions;
        });

        this._subs.push(this.rendererVersionControl.valueChanges.subscribe((containerImage: string) => {
            if (this._propagateChange) {
                this._propagateChange(containerImage);
            }
            this.containerImage = containerImage;
            this.changeDetector.markForCheck();
        }));

        this._subs.push(this.appVersionControl.valueChanges.subscribe((appVersion: string) => {
            this.containerImagesData =
                this.renderingContainerImageService.getContainerImagesForAppVersion(
                this.app, this.renderEngine, this.imageReferenceId, appVersion);

            this.containerImagesData.subscribe((containerImages) => {
                this.containerImages = containerImages;
            });

            const defaultImage = (Array.isArray(this.containerImages) &&
                this.containerImages.length > 0) ? this.containerImages[0].containerImage : null;

            this.rendererVersionControl.setValue(defaultImage);

            this.changeDetector.markForCheck();
        }));
    }

    public trackContainerImage(_, image: RenderingContainerImage) {
        return image.containerImage;
    }

    public trackAppVersion(_, image: string) {
       return image;
    }

    public writeValue(containerImageId: string) {
        if (containerImageId) {
            this.renderingContainerImageService.findContainerImageById(containerImageId)
            .pipe(map(image => {
                this.appVersionControl.setValue(image.appVersion);
                this.rendererVersionControl.setValue(image.rendererVersion);
                }));
        } else {
            this.appVersionControl.setValue(null);
            this.rendererVersionControl.setValue(null);
        }
    }

    public registerOnChange(fn) {
        this._propagateChange = fn;
    }

    public registerOnTouched() {
        // Do nothing
    }

    public validate() {
        return null;
    }

    public get appDisplay() {
        return this.UpperCaseFirstChar(this.app);
    }

    public get renderEngineDisplay() {
        return this.UpperCaseFirstChar(this.renderEngine);
    }

    public ngOnChanges(changes) {
        if (changes) {
            this.changeDetector.markForCheck();
        }
    }

    public ngOnDestroy() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    private UpperCaseFirstChar(lower: string) {
        return lower.charAt(0).toUpperCase() + lower.substr(1);
    }
}
